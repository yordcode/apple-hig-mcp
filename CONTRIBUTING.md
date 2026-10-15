# Contributing

Open an issue for a bug, missing topic, inaccurate platform tag, or proposed improvement. Include the tool input, expected result, actual result, Node.js version, and assistant used. Include the official Apple URL for guideline changes.

## Local checks

```bash
npm ci
npm run typecheck
npm test
npm run build
```

Add a regression test for a bug fix. Keep network-dependent checks in the optional live suite. Rebuild `dist/index.js` when server source changes because repository-based plugin installations use the committed bundle.

Submit a pull request describing the problem, changed behavior, and checks run. Keep workstation configuration, credentials, and fetched Apple article content out of commits. Original reference cards should cite official articles rather than copy their text.
