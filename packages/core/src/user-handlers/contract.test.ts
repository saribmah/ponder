import { getFunctionSelector, hexToBigInt } from "viem";
import { expect, test, vi } from "vitest";

import { usdcContractConfig } from "@/_test/constants";
import { publicClient } from "@/_test/utils";
import { Contract } from "@/config/contracts";
import { Network } from "@/config/networks";

import { getInjectedContract } from "./contract";

const network: Network = {
  name: "mainnet",
  chainId: 1,
  client: publicClient,
  pollingInterval: 1_000,
  defaultMaxBlockRange: 3,
  finalityBlockCount: 10,
};

const contract: Contract = {
  name: "USDC",
  address: usdcContractConfig.address,
  abi: usdcContractConfig.abi,
  network: network,
};

// Test data generated from Alchemy Composer.
const usdcTotalSupply16375000 = 40921687992499550n;
const usdcTotalSupply16380000 = 40695630049769550n; // This is "latest" for our test setup.

test("getInjectedContract() returns data", async (context) => {
  const { eventStore } = context;

  const injectedContract = getInjectedContract({
    contract,
    getCurrentBlockNumber: () => 16375000n,
    eventStore,
  });

  const decimals = await injectedContract.read.decimals();
  expect(decimals).toBe(6);
});

test("getInjectedContract() uses current block number if no overrides are provided", async (context) => {
  const { eventStore } = context;

  const injectedContract = getInjectedContract({
    contract,
    getCurrentBlockNumber: () => 16375000n,
    eventStore,
  });

  const totalSupply = await injectedContract.read.totalSupply();

  expect(totalSupply).toBe(usdcTotalSupply16375000);
});

test("getInjectedContract() caches the read result if no overrides are provided", async (context) => {
  const { eventStore } = context;

  const callSpy = vi.spyOn(contract.network.client, "call");

  const injectedContract = getInjectedContract({
    contract,
    getCurrentBlockNumber: () => 16375000n,
    eventStore,
  });

  await injectedContract.read.totalSupply();

  expect(callSpy).toHaveBeenCalledTimes(1);

  const cachedContractReadResult = await eventStore.getContractReadResult({
    address: contract.address,
    blockNumber: 16375000n,
    chainId: 1,
    data: getFunctionSelector("totalSupply()"),
  });

  expect(cachedContractReadResult).not.toBeNull();
  expect(hexToBigInt(cachedContractReadResult!.result)).toBe(
    usdcTotalSupply16375000
  );

  expect(callSpy).toHaveBeenCalledTimes(1);
});

test("getInjectedContract() uses blockTag override if provided", async (context) => {
  const { eventStore } = context;

  const injectedContract = getInjectedContract({
    contract,
    getCurrentBlockNumber: () => 16375000n,
    eventStore,
  });

  const totalSupply = await injectedContract.read.totalSupply({
    blockTag: "latest",
  });

  expect(totalSupply).toBe(usdcTotalSupply16380000);
});

test("getInjectedContract() does not cache data if blockTag override is provided", async (context) => {
  const { eventStore } = context;

  const injectedContract = getInjectedContract({
    contract,
    getCurrentBlockNumber: () => 16375000n,
    eventStore,
  });

  await injectedContract.read.totalSupply({
    blockTag: "latest",
  });

  const cachedContractReadResult = await eventStore.getContractReadResult({
    address: contract.address,
    blockNumber: 16375000n,
    chainId: 1,
    data: getFunctionSelector("totalSupply()"),
  });

  expect(cachedContractReadResult).toBeNull();
});
