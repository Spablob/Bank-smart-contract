import { ethers } from 'hardhat';
import { Token } from '../typechain-types';
import { Pool } from '../typechain-types';

async function main() {
  let token: Token;
  let pool: Pool;

  const [deployer] = await ethers.getSigners();
  console.log({ 'Deploying contracts with the account:': deployer.address });

  // Deploy Token Contract
  const TokenContractFactory = await ethers.getContractFactory('Token');
  token = await TokenContractFactory.deploy();
  await token.deployed();
  console.log({ 'Token contract deployed to': token.address });

  // Deploy Pool Contract
  const PoolContractFactory = await ethers.getContractFactory('Pool');
  pool = await PoolContractFactory.deploy(604800, token.address);
  await pool.deployed();
  console.log({ 'Pool contract deployed to': pool.address });

  // Owner deposits the token rewards in the Pool contract
  await token.connect(deployer).approve(pool.address, ethers.constants.MaxUint256);
  await pool.connect(deployer).ownerDeposit(ethers.BigNumber.from('99998000000000000000000000'));
  console.log({ 'Tokens for Pool rewards:': await token.connect(deployer).balanceOf(pool.address) });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
