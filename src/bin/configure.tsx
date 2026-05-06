#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { App } from "../tui/App.js";
import { loadConfig } from "../core/config.js";

const config = loadConfig();
render(<App initial={config} />);
