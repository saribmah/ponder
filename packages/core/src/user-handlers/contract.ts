import {
  type ReadContractParameters,
  BaseError,
  CallParameters,
  decodeFunctionResult,
  encodeFunctionData,
  getContract,
  getContractError,
  Hex,
} from "viem";

import type { Contract } from "@/config/contracts";
import type { EventStore } from "@/event-store/store";

export function getInjectedContract({
  contract,
  getCurrentBlockNumber,
  eventStore,
}: {
  contract: Contract;
  getCurrentBlockNumber: () => bigint;
  eventStore: EventStore;
}) {
  const { abi, address } = contract;
  const { chainId, client: publicClient } = contract.network;

  const injectedContract = getContract({ abi, address, publicClient });

  injectedContract.read = new Proxy(
    {},
    {
      get(_, functionName: string) {
        return async (
          ...parameters: [
            args?: readonly unknown[],
            options?: Omit<
              ReadContractParameters,
              "abi" | "address" | "functionName" | "args"
            >
          ]
        ) => {
          const { args, options } = getFunctionParameters(parameters);

          // If the user specified a block tag, serve the request as normal (no caching).
          if (options?.blockTag) {
            return publicClient.readContract({
              abi,
              address,
              functionName,
              args,
              ...options,
            } as ReadContractParameters);
          }

          // If the user specified a block number, use it, otherwise use the
          // block number of the current event being handled.
          const blockNumber = options?.blockNumber ?? getCurrentBlockNumber();

          const calldata = encodeFunctionData({ abi, args, functionName });

          const decodeRawResult = (rawResult: Hex) => {
            try {
              return decodeFunctionResult({
                abi,
                args,
                functionName,
                data: rawResult,
              });
            } catch (err) {
              throw getContractError(err as BaseError, {
                abi,
                address,
                args,
                docsPath: "/docs/contract/readContract",
                functionName,
              });
            }
          };

          // Check if this request can be served from the cache.
          const cachedContractReadResult =
            await eventStore.getContractReadResult({
              address,
              blockNumber,
              chainId,
              data: calldata,
            });

          if (cachedContractReadResult) {
            return decodeRawResult(cachedContractReadResult.result);
          }

          // Cache miss. Make the RPC request, then add to the cache.
          let rawResult: Hex;
          try {
            const { data } = await publicClient.call({
              data: calldata,
              to: address,
              ...{
                ...options,
                blockNumber,
              },
            } as unknown as CallParameters);

            rawResult = data || "0x";
          } catch (err) {
            throw getContractError(err as BaseError, {
              abi,
              address,
              args,
              docsPath: "/docs/contract/readContract",
              functionName,
            });
          }

          await eventStore.insertContractReadResult({
            address,
            blockNumber,
            chainId,
            data: calldata,
            finalized: false,
            result: rawResult,
          });

          return decodeRawResult(rawResult);
        };
      },
    }
  );

  return injectedContract;
}

function getFunctionParameters(
  values: [args?: readonly unknown[], options?: object]
) {
  const hasArgs = values.length && Array.isArray(values[0]);
  const args = hasArgs ? values[0]! : [];
  const options = ((hasArgs ? values[1] : values[0]) ?? {}) as Omit<
    ReadContractParameters,
    "abi" | "address" | "functionName" | "args"
  >;
  return { args, options };
}
