#!/usr/bin/env node
import { jsx as _jsx } from "react/jsx-runtime";
import { render } from "ink";
import { App } from "../tui/App.js";
import { loadConfig } from "../core/config.js";
const config = loadConfig();
render(_jsx(App, { initial: config }));
