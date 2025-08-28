const hre = require("hardhat");

async function main() {
  const SimpleERC20 = await hre.ethers.getContractFactory("SimpleERC20");
  console.log("Deploying SimpleERC20 token");
  const simpleERC20 = await SimpleERC20.deploy("SimpleToken", "STK", 18);

  await simpleERC20.waitForDeployment();
  console.log(`SimpleERC20 token deployed to: ${simpleERC20.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
