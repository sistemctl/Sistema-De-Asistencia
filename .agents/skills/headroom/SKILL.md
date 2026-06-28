---
name: headroom
description: Context optimization and token reduction skill. Teaches the agent how to compress code, JSON payloads, logs, and database queries using headroom's AST-aware compression (SmartCrusher, CodeCompressor) to save 60-95% of context window tokens.
---

# Headroom Context Optimization

Use this skill when dealing with massive file reads, large log traces, database payloads, or extensive terminal command outputs to compress the token footprint before sending or processing context.

## Core Capabilities of Headroom

1. **AST-Aware Code Compression (CodeCompressor)**: Compresses source code files (Python, JS/TS, Go, Rust, C++) while maintaining semantic structure by keeping function signatures and class definitions, but removing boilerplate implementation details when they are not actively edited.
2. **JSON Payloads Compression (SmartCrusher)**: Automatically structuralizes, flattens, or truncates repetitive keys and schema patterns in large API responses, database dumps, and network logs.
3. **Content Routing (ContentRouter)**: Automatically detects content types and routes them to the most efficient compression strategy.

## Guidelines for Using Headroom Compression

### 1. Identify High-Token Context Inputs
Always check for:
- Large SQL dumps / diagnostic queries
- Extensive tracebacks, uvicorn logs, or system performance data
- Deeply nested JSON payloads from backend APIs

### 2. Apply Compression Strategies

- **For Source Code:**
  Keep the top-level interfaces, imports, and definitions, but collapse inner function blocks that are not relevant to the current task using standard folding notation (e.g., `# ... collapsed for brevity`).
- **For Logs and Terminal Tracebacks:**
  Filter out duplicate warning traces or redundant HTTP headers, keeping only unique error signatures, status codes, and line numbers.
- **For Database/JSON Results:**
  Keep the first 2-3 records to understand the schema, and replace the remaining records with a summary (e.g., `[+197 identical items truncated]`).

## Quick Execution Process

1. **Check Context Budget:** Estimate the size of the file/log you are about to read or output. If it exceeds 10,000 tokens, apply headroom compression.
2. **Select Router Strategy:** Choose whether to use Code, JSON, or Log compression.
3. **Format clearly:** Always format compressed items with clear indicators so the user (and LLMs) know they are reading a compressed representation (e.g. `[Headroom compressed: ... ]`).
