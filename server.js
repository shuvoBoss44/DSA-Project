require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Paths to C++ search engine resources
const BIN_PATH = process.env.BIN_PATH ? path.resolve(__dirname, process.env.BIN_PATH) : path.join(__dirname, 'main');
const CORPUS_PATH = process.env.CORPUS_PATH ? path.resolve(__dirname, process.env.CORPUS_PATH) : path.join(__dirname, 'test_files');

// Helper to execute the compiled C++ binary and return JSON
function runSearchEngine(args) {
  return new Promise((resolve, reject) => {
    // args starts with CORPUS_PATH and --json
    const fullArgs = [CORPUS_PATH, '--json', ...args];
    execFile(BIN_PATH, fullArgs, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Execution error: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        return reject({ status: 'error', message: error.message, details: stderr });
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (parseError) {
        console.error(`JSON Parse error for stdout: "${stdout}"`);
        reject({ status: 'error', message: 'Failed to parse engine output', details: stdout });
      }
    });
  });
}

// API Endpoints
app.get('/api/stats', async (req, res) => {
  try {
    const data = await runSearchEngine(['--stats']);
    res.json(data);
  } catch (err) {
    res.status(500).json(err);
  }
});

app.get('/api/search', async (req, res) => {
  const { q, caseSensitive } = req.query;
  if (!q) {
    return res.status(400).json({ status: 'error', message: 'Query parameter "q" is required' });
  }
  const flag = caseSensitive === 'true' ? '--search-sensitive' : '--search';
  try {
    const data = await runSearchEngine([flag, q]);
    res.json(data);
  } catch (err) {
    res.status(500).json(err);
  }
});

app.get('/api/autocomplete', async (req, res) => {
  const { prefix } = req.query;
  if (!prefix) {
    return res.status(400).json({ status: 'error', message: 'Prefix parameter is required' });
  }
  try {
    const data = await runSearchEngine(['--autocomplete', prefix]);
    res.json(data);
  } catch (err) {
    res.status(500).json(err);
  }
});

app.get('/api/benchmark', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ status: 'error', message: 'Query parameter "q" is required' });
  }
  try {
    const data = await runSearchEngine(['--benchmark', q]);
    res.json(data);
  } catch (err) {
    res.status(500).json(err);
  }
});

app.get('/api/file', async (req, res) => {
  const { name } = req.query;
  if (!name) {
    return res.status(400).json({ status: 'error', message: 'File name parameter is required' });
  }
  try {
    const data = await runSearchEngine(['--file-content', name]);
    res.json(data);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Serve static assets in production
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Fallback to React app router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Static assets not built yet. Run build process.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Express API Gateway running on port ${PORT}`);
  console.log(`Binary path: ${BIN_PATH}`);
  console.log(`Corpus directory: ${CORPUS_PATH}`);
});
