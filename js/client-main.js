// Start the curtain before asynchronous Linux alias setup. main.js imports the
// same module; ES module caching prevents a second curtain.
import "./boot-reveal.js";
import { ready } from "./client-classes.js";
await ready;
await import("./main.js");
