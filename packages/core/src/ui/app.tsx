import { Box, Newline, render as inkRender, Text } from "ink";
import React from "react";

import { LogFilter } from "@/config/logFilters";

import { HandlersBar } from "./HandlersBar";
import { HistoricalBar } from "./HistoricalBar";

export type UiState = {
  port: number;

  stats: Record<
    string,
    {
      cacheRate: number;

      logStartTimestamp: number;
      logTotal: number;
      logCurrent: number;
      logAvgDuration: number;
      logAvgBlockCount: number;

      blockStartTimestamp: number;
      blockTotal: number;
      blockCurrent: number;
      blockAvgDuration: number;

      eta: number;
    }
  >;

  isHistoricalSyncComplete: boolean;
  historicalSyncDuration: string;

  handlerError: boolean;
  handlersCurrent: number;
  handlersTotal: number;
  handlersHandledTotal: number;
  handlersToTimestamp: number;

  networks: string[];
};

export const buildUiState = ({ logFilters }: { logFilters: LogFilter[] }) => {
  const ui: UiState = {
    port: 0,

    stats: {},

    isHistoricalSyncComplete: false,
    historicalSyncDuration: "",

    handlerError: false,
    handlersCurrent: 0,
    handlersTotal: 0,
    handlersHandledTotal: 0,
    handlersToTimestamp: 0,

    networks: [],
  };

  logFilters.forEach((logFilter) => {
    ui.stats[logFilter.name] = {
      cacheRate: 0,
      logStartTimestamp: 0,
      logTotal: 0,
      logCurrent: 0,
      logAvgDuration: 0,
      logAvgBlockCount: 0,
      blockStartTimestamp: 0,
      blockTotal: 0,
      blockCurrent: 0,
      blockAvgDuration: 0,
      eta: 0,
    };
  });

  return ui;
};

const App = (ui: UiState) => {
  const {
    port,
    stats,
    isHistoricalSyncComplete,
    historicalSyncDuration,
    handlersCurrent,
    handlerError,
    networks,
  } = ui;

  if (handlerError) {
    return (
      <Box flexDirection="column">
        <Text> </Text>
        <Text color="cyan">
          Resolve the error and save your changes to reload the server.
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Newline above interface */}
      <Text> </Text>
      <Box flexDirection="row">
        <Text bold={true}>Historical sync </Text>
        {isHistoricalSyncComplete ? (
          <Text color="greenBright">
            (done in {historicalSyncDuration})<Newline />
          </Text>
        ) : (
          <Text color="yellowBright">(in progress)</Text>
        )}
      </Box>
      {!isHistoricalSyncComplete && (
        <Box flexDirection="column">
          {Object.entries(stats).map(([contract, stat]) => (
            <HistoricalBar key={contract} contract={contract} stat={stat} />
          ))}
          <Text> </Text>
        </Box>
      )}

      <HandlersBar ui={ui} />

      {networks.length > 0 && (
        <Box flexDirection="column">
          <Text bold={true}>Networks</Text>
          {networks.map((network) => (
            <Box flexDirection="row" key={network}>
              <Text>
                {network.slice(0, 1).toUpperCase() + network.slice(1)} (live)
              </Text>
            </Box>
          ))}
          <Text> </Text>
        </Box>
      )}

      {handlersCurrent > 0 && (
        <Box flexDirection="column">
          <Text bold={true}>GraphQL </Text>
          <Box flexDirection="row">
            <Text>Server live at http://localhost:{port}</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export const setupInkApp = (ui: UiState) => {
  const { rerender, unmount: inkUnmount, clear } = inkRender(<App {...ui} />);

  const render = (ui: UiState) => {
    rerender(<App {...ui} />);
  };

  const unmount = () => {
    clear();
    inkUnmount();
  };
  return { render, unmount };
};
