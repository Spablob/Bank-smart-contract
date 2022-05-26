import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Token } from '../typechain-types';
import { Pool } from '../typechain-types';

describe('MockInteractions', async () => {
  let token: Token;
  let pool: Pool;
  let accounts: SignerWithAddress[];

  before(async () => {
    accounts = await ethers.getSigners();

    // Deploy Token Contract
    const TokenContractFactory = await ethers.getContractFactory('Token');
    token = await TokenContractFactory.deploy();
    await token.deployed();
    console.log({ 'Token contract deployed to': token.address });

    const PoolContractFactory = await ethers.getContractFactory('Pool');
    pool = await PoolContractFactory.deploy(604800, token.address);
    await pool.deployed();
    console.log({ 'Pool contract deployed to': pool.address });
  });

  describe('Moment 0: Owner wallet sends tokens to Pool contract', async () => {
    it('It reverts if not the owner', async () => {
      await expect(
        pool.connect(accounts[1]).ownerDeposit(ethers.BigNumber.from('100000000000000000000000000'))
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('It reverts if the owner attemps amount <0', async () => {
      await expect(pool.connect(accounts[0]).ownerDeposit(0)).to.be.revertedWith('Amount must be more than 0');
      await expect(pool.connect(accounts[0]).ownerDeposit(-1)).to.be.reverted;
    });
    it('It reverts if the user tries to stake before rewards have been deposited', async () => {
      await token.connect(accounts[0]).approve(accounts[1].address, ethers.constants.MaxUint256);
      await token.connect(accounts[0]).transfer(accounts[1].address, ethers.BigNumber.from('1000000000000000000000'));
      await token.connect(accounts[0]).approve(accounts[2].address, ethers.constants.MaxUint256);
      await token.connect(accounts[0]).transfer(accounts[2].address, ethers.BigNumber.from('1000000000000000000000'));
      await token.connect(accounts[1]).approve(pool.address, ethers.constants.MaxUint256);
      await token.connect(accounts[2]).approve(pool.address, ethers.constants.MaxUint256);
      await expect(pool.connect(accounts[1]).stake(ethers.BigNumber.from('1000000000000000000000'))).to.be.revertedWith(
        'The user is protected from staking before the pool rewards have been deposited by the owner'
      );
      await expect(pool.connect(accounts[2]).stake(ethers.BigNumber.from('1000000000000000000000'))).to.be.revertedWith(
        'The user is protected from staking before the pool rewards have been deposited by the owner'
      );
    });
    it('Owner successfully deposits', async () => {
      await token.connect(accounts[0]).approve(pool.address, ethers.constants.MaxUint256);
      await pool.connect(accounts[0]).ownerDeposit(ethers.BigNumber.from('99998000000000000000000000'));
    });
    it('It reverts if the owner tries to deposit twice', async () => {
      await expect(
        pool.connect(accounts[0]).ownerDeposit(ethers.BigNumber.from('99998000000000000000000000'))
      ).to.be.revertedWith('The owner can only deposit the rewards once');
    });
  });

  describe('Period 0-1T', async () => {
    it('It reverts if the owner attemps amount <0', async () => {
      await expect(pool.connect(accounts[1]).stake(0)).to.be.revertedWith('Amount must be more than 0');
      await expect(pool.connect(accounts[1]).stake(-1)).to.be.reverted;
    });
    it('Users successfully stakes', async () => {
      await pool.connect(accounts[1]).stake(ethers.BigNumber.from('1000000000000000000000'));
      await pool.connect(accounts[2]).stake(ethers.BigNumber.from('1000000000000000000000'));
      expect(await pool.totalStakedAmount()).to.be.equal('2000000000000000000000');
      expect(await pool.stakedAmount(accounts[1].address)).to.be.equal('1000000000000000000000');
      expect(await pool.stakedAmount(accounts[2].address)).to.be.equal('1000000000000000000000');
    });
    it('It reverts if users try to withdraw before 2T', async () => {
      await expect(pool.connect(accounts[1]).stake(0)).to.be.revertedWith('Amount must be more than 0');
      await expect(pool.connect(accounts[1]).stake(-1)).to.be.reverted;
    });
  });

  describe('Period 1-2T', async () => {
    it('It reverts if users try to withdraw before 2T', async () => {
      await ethers.provider.send('evm_increaseTime', [604801]);
      await expect(pool.connect(accounts[1]).stake(0)).to.be.revertedWith('Amount must be more than 0');
      await expect(pool.connect(accounts[1]).stake(-1)).to.be.reverted;
    });
    it('It reverts if users tries to deposit beyond time T', async () => {
      await expect(pool.connect(accounts[1]).stake(ethers.BigNumber.from('1000000000000000000000'))).to.be.revertedWith(
        'User can only stake during the deposit period'
      );
      await expect(pool.connect(accounts[2]).stake(ethers.BigNumber.from('1000000000000000000000'))).to.be.revertedWith(
        'User can only stake during the deposit period'
      );
    });
  });

  describe('Period 2-3T', async () => {
    it('User 1 successfully withdraws', async () => {
      await ethers.provider.send('evm_increaseTime', [604801]);
      expect(await token.connect(accounts[1]).balanceOf(accounts[1].address)).to.be.equal(0);
      await pool.connect(accounts[1]).withdraw();
      expect(await token.connect(accounts[1]).balanceOf(accounts[1].address)).to.be.equal('10000800000000000000000000');
      expect(await pool.connect(accounts[1]).totalStakedAmount()).to.be.equal('1000000000000000000000');
      expect(await pool.connect(accounts[1]).stakedAmount(accounts[1].address)).to.be.equal('0');
    });
  });

  describe('Period 3-4T', async () => {
    it('User 2 successfully withdraws', async () => {
      await ethers.provider.send('evm_increaseTime', [604801]);
      expect(await token.connect(accounts[2]).balanceOf(accounts[2].address)).to.be.equal(0);
      await pool.connect(accounts[2]).withdraw();
      expect(await token.connect(accounts[2]).balanceOf(accounts[2].address)).to.be.equal('40000200000000000000000000');
      expect(await pool.connect(accounts[2]).totalStakedAmount()).to.be.equal('0');
      expect(await pool.connect(accounts[2]).stakedAmount(accounts[2].address)).to.be.equal('0');
    });
    it('It reverts when owner tries to withdraw before 4T', async () => {});
    await expect(pool.connect(accounts[0]).ownerWithdraw()).to.be.revertedWith(
      'The owner can only withdraw if all users unstake before 4T'
    );
  });

  describe('Period 4T+', async () => {
    it('Owner withdraws the remaining tokens', async () => {
      await ethers.provider.send('evm_increaseTime', [604801]);
      pool.connect(accounts[0]).ownerWithdraw();
      expect(await token.connect(accounts[0]).balanceOf(pool.address)).to.be.equal('0');
      expect(await token.connect(accounts[0]).balanceOf(accounts[0].address)).to.be.equal('49999000000000000000000000');
    });
  });
});
