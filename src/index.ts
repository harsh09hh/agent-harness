import React from "react";
import { render } from "ink";
import { App } from "./ui/index.tsx";

// full-screen: the input bar stays at the bottom and the chat scrolls above it
render(React.createElement(App), { alternateScreen: true });
