import pinataSDK from "@pinata/sdk";
import { Readable } from "stream";
import { logger } from "../config/loggerConfig.js";

const DEFAULT_GATEWAY = "https://gateway.pinata.cloud";

function createClient() {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("PINATA_JWT is not configured");
  return new pinataSDK({ pinataJWTKey: jwt });
}

export async function uploadToPinata(file) {
  const pinata = createClient();

  const stream = Readable.from(file.buffer);
  stream.path = file.originalname;

  const result = await pinata.pinFileToIPFS(stream, {
    pinataMetadata: {
      name: file.originalname,
      keyvalues: { mimeType: file.mimetype },
    },
    pinataOptions: { cidVersion: 1 },
  });

  const cid = result.IpfsHash;
  const url = getPinataGatewayUrl(cid);

  logger.info(`Pinata upload complete. CID: ${cid}`);
  return { cid, url };
}

export async function unpinFromPinata(cid) {
  const pinata = createClient();
  await pinata.unpin(cid);
  logger.info(`Unpinned from Pinata: ${cid}`);
}

export function getPinataGatewayUrl(cid) {
  const gateway = process.env.PINATA_GATEWAY || DEFAULT_GATEWAY;
  return `${gateway}/ipfs/${cid}`;
}

export async function testPinataConnection() {
  const pinata = createClient();
  const result = await pinata.testAuthentication();
  return result.authenticated === true;
}
