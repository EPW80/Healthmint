import { promises as fs } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Migration function
export default async function (deployer, network, accounts) {
  console.log("\nInitiating Migrations contract deployment");

  // Load Migrations artifact
  const artifactPath = path.join(
    __dirname,
    "../build/contracts/Migrations.json"
  );
  const artifactData = await fs.readFile(artifactPath, "utf8");
  const artifact = JSON.parse(artifactData);

  const Migrations = deployer.truffle.Contract(artifact);
  await deployer.deploy(Migrations);

  console.log("Migrations contract deployed");
}
