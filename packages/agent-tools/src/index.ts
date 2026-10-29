/**
 * @packages/agent-tools
 * Complete Suite of OpenCode Workspace & Agent Tools
 */

import { shellTool } from './tools/shell.js';
import { readTool } from './tools/read.js';
import { writeTool } from './tools/write.js';
import { editTool } from './tools/edit.js';
import { grepTool } from './tools/grep.js';
import { globTool } from './tools/glob.js';
import { lsTool } from './tools/ls.js';
import { fetchTool } from './tools/fetch.js';
import { codeInterpreterTool } from './tools/code_interpreter.js';
import { taskTool } from './tools/task.js';

export {
  shellTool,
  readTool,
  writeTool,
  editTool,
  grepTool,
  globTool,
  lsTool,
  fetchTool,
  codeInterpreterTool,
  taskTool,
};

export function createAgentTools() {
  return [
    shellTool,
    readTool,
    writeTool,
    editTool,
    grepTool,
    globTool,
    lsTool,
    fetchTool,
    codeInterpreterTool,
    taskTool,
  ];
}
