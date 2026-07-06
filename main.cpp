// ============================================================================
// TEXT SEARCH ENGINE
// A terminal-based search engine that finds text in .txt files and ranks
// results by relevance using TF-IDF scoring.
//
// Team: Kafi (2310058), Sazid (2310059), Azaz (2310060), Shuvo (2310061)
//
// Compile: g++ -std=c++17 -o search_engine main_show.cpp
// Run:     ./search_engine ./test_files
// ============================================================================

#include <algorithm>
#include <cctype>
#include <chrono>
#include <cmath>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <stack>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

using namespace std;

bool globalJsonMode = false;

string escapeJSON(const string &s) {
  string o;
  for (char c : s) {
    if (c == '"') o += "\\\"";
    else if (c == '\\') o += "\\\\";
    else if (c == '\b') o += "\\b";
    else if (c == '\f') o += "\\f";
    else if (c == '\n') o += "\\n";
    else if (c == '\r') o += "\\r";
    else if (c == '\t') o += "\\t";
    else if (c >= 0 && c <= 31) {
      // ignore control characters
    } else {
      o += c;
    }
  }
  return o;
}

// ========================= Data Types =========================

struct FileData {
  string filePath;
  string fileName;
  vector<string> lines;
  int totalWords;
};

struct SearchResult {
  int fileIndex;
  string fileName;
  int matchCount;
  double tfidfScore;
  vector<pair<int, string>> matchingLines;
};

// ========================= Tokenizer =========================
// Breaks text into lowercase words, removing punctuation

string toLowercase(const string &text) {
  string result = text;
  for (int i = 0; i < (int)result.length(); i++)
    result[i] = tolower(result[i]);
  return result;
}

bool isAlphanumeric(char c) { return isalpha(c) || isdigit(c); }

vector<string> tokenize(const string &line) {
  vector<string> tokens;
  string currentWord = "";
  for (int i = 0; i < (int)line.length(); i++) {
    char c = line[i];
    if (isAlphanumeric(c)) {
      currentWord += tolower(c);
    } else {
      if (!currentWord.empty()) {
        tokens.push_back(currentWord);
        currentWord = "";
      }
    }
  }
  if (!currentWord.empty())
    tokens.push_back(currentWord);
  return tokens;
}

// ========================= Stopwords =========================
// Hash set of common words to skip during indexing — O(1) lookup

static unordered_set<string> stopwordSet;
static bool stopwordsInitialized = false;

unordered_set<string> getStopwords() {
  return {"a",     "an",    "the",  "and",  "or",    "but",   "is",     "are",
          "was",   "were",  "be",   "been", "being", "have",  "has",    "had",
          "do",    "does",  "did",  "will", "would", "could", "should", "may",
          "might", "shall", "in",   "on",   "at",    "to",    "for",    "of",
          "with",  "by",    "from", "it",   "its",   "this",  "that",   "these",
          "those", "i",     "me",   "my",   "we",    "our",   "you",    "your",
          "he",    "she",   "him",  "her",  "his",   "they",  "them",   "their",
          "what",  "which", "who",  "whom", "where", "when",  "how",    "why",
          "not",   "no",    "nor",  "so",   "if",    "then",  "than",   "too",
          "very",  "can",   "just", "also", "as",    "into",  "each",   "all",
          "any",   "both",  "such", "only", "own",   "same",  "other",  "about",
          "up"};
}

bool isStopword(const string &word) {
  if (!stopwordsInitialized) {
    stopwordSet = getStopwords();
    stopwordsInitialized = true;
  }
  return stopwordSet.find(word) != stopwordSet.end();
}

// ========================= File Loader =========================
// Scans a directory for .txt files and loads them into memory

vector<string> scanDirectory(const string &directoryPath) {
  vector<string> filePaths;
  if (!filesystem::exists(directoryPath)) {
    if (!globalJsonMode) {
      cout << "Error: Directory '" << directoryPath << "' does not exist."
           << endl;
    }
    return filePaths;
  }
  if (!filesystem::is_directory(directoryPath)) {
    if (!globalJsonMode) {
      cout << "Error: '" << directoryPath << "' is not a directory." << endl;
    }
    return filePaths;
  }
  for (const auto &entry : filesystem::directory_iterator(directoryPath)) {
    if (entry.is_regular_file() && entry.path().extension() == ".txt")
      filePaths.push_back(entry.path().string());
  }
  return filePaths;
}

FileData loadFile(const string &filePath) {
  FileData data;
  data.filePath = filePath;
  data.totalWords = 0;
  data.fileName = filesystem::path(filePath).filename().string();
  ifstream file(filePath);
  if (!file.is_open()) {
    if (!globalJsonMode) {
      cout << "Warning: Could not open '" << filePath << "'" << endl;
    }
    return data;
  }
  string line;
  while (getline(file, line)) {
    data.lines.push_back(line);
    istringstream stream(line);
    string word;
    while (stream >> word)
      data.totalWords++;
  }
  file.close();
  return data;
}

vector<FileData> loadAllFiles(const string &directoryPath) {
  vector<FileData> allFiles;
  vector<string> paths = scanDirectory(directoryPath);
  if (paths.empty()) {
    if (!globalJsonMode) {
      cout << "No .txt files found in '" << directoryPath << "'" << endl;
    }
    return allFiles;
  }
  for (const string &path : paths)
    allFiles.push_back(loadFile(path));
  if (!globalJsonMode) {
    cout << "Loaded " << allFiles.size() << " file(s)." << endl;
  }
  return allFiles;
}

// ========================= Inverted Index =========================
// Hash table mapping each word to its locations — O(1) average lookup

struct IndexEntry {
  int fileIndex;
  int lineNumber;
};

class InvertedIndex {
public:
  unordered_map<string, vector<IndexEntry>> index;
  int totalDocuments;

  // Scans all files, tokenizes each line, and populates the index
  void buildIndex(const vector<FileData> &files) {
    clear();
    totalDocuments = files.size();
    for (int f = 0; f < (int)files.size(); f++) {
      for (int l = 0; l < (int)files[f].lines.size(); l++) {
        vector<string> words = tokenize(files[f].lines[l]);
        for (const string &word : words) {
          if (!isStopword(word))
            index[word].push_back({f, l + 1});
        }
      }
    }
    if (!globalJsonMode) {
      cout << "Index built: " << index.size() << " unique words." << endl;
    }
  }

  // Returns all locations where a single word appears
  vector<IndexEntry> lookupWord(const string &word) const {
    auto it = index.find(toLowercase(word));
    if (it != index.end())
      return it->second;
    return {};
  }

  // Finds files containing ALL words, then verifies the exact phrase
  vector<IndexEntry> lookupPhrase(const string &phrase,
                                  const vector<FileData> &files) const {
    vector<IndexEntry> results;
    vector<string> queryWords = tokenize(phrase);
    if (queryWords.empty())
      return results;

    // Get candidate files from the first word
    vector<IndexEntry> first = lookupWord(queryWords[0]);
    if (first.empty())
      return results;
    unordered_set<int> candidates;
    for (const auto &e : first)
      candidates.insert(e.fileIndex);

    // Intersect with files containing each subsequent word
    for (int w = 1; w < (int)queryWords.size(); w++) {
      vector<IndexEntry> entries = lookupWord(queryWords[w]);
      unordered_set<int> hasWord;
      for (const auto &e : entries)
        hasWord.insert(e.fileIndex);
      unordered_set<int> intersect;
      for (int f : candidates)
        if (hasWord.count(f))
          intersect.insert(f);
      candidates = intersect;
    }

    // Verify exact phrase exists in candidate files
    string lowerPhrase = toLowercase(phrase);
    for (int f : candidates) {
      for (int l = 0; l < (int)files[f].lines.size(); l++) {
        if (toLowercase(files[f].lines[l]).find(lowerPhrase) != string::npos)
          results.push_back({f, l + 1});
      }
    }
    return results;
  }

  vector<string> getAllWords() const {
    vector<string> words;
    for (const auto &p : index)
      words.push_back(p.first);
    return words;
  }

  // How many different files contain this word (for IDF)
  int getDocumentFrequency(const string &word) const {
    auto it = index.find(toLowercase(word));
    if (it == index.end())
      return 0;
    unordered_set<int> unique;
    for (const auto &e : it->second)
      unique.insert(e.fileIndex);
    return unique.size();
  }

  void clear() {
    index.clear();
    totalDocuments = 0;
  }
};

// ========================= Trie (Autocomplete) =========================
// Prefix tree for suggesting words as the user types — O(L) per operation

struct TrieNode {
  unordered_map<char, TrieNode *> children;
  bool isEndOfWord;
  int frequency;
  TrieNode() : isEndOfWord(false), frequency(0) {}
};

class Trie {
public:
  TrieNode *root;
  int wordCount;

  Trie() : root(new TrieNode()), wordCount(0) {}
  ~Trie() { deleteAll(root); }

  // Disable copying to prevent shallow copy issues
  Trie(const Trie &) = delete;
  Trie &operator=(const Trie &) = delete;

  // Enable move semantics to safely reassign
  Trie(Trie &&other) noexcept : root(other.root), wordCount(other.wordCount) {
    other.root = nullptr;
    other.wordCount = 0;
  }
  Trie &operator=(Trie &&other) noexcept {
    if (this != &other) {
      deleteAll(root);
      root = other.root;
      wordCount = other.wordCount;
      other.root = nullptr;
      other.wordCount = 0;
    }
    return *this;
  }

  void insert(const string &word, int docFreq) {
    if (word.empty())
      return;
    TrieNode *cur = root;
    for (char c : word) {
      if (cur->children.find(c) == cur->children.end())
        cur->children[c] = new TrieNode();
      cur = cur->children[c];
    }
    if (!cur->isEndOfWord)
      wordCount++;
    cur->isEndOfWord = true;
    cur->frequency = docFreq;
  }

  bool search(const string &word) const {
    TrieNode *cur = root;
    for (char c : word) {
      if (cur->children.find(c) == cur->children.end())
        return false;
      cur = cur->children[c];
    }
    return cur->isEndOfWord;
  }

  // DFS from prefix node to collect complete words
  vector<string> getSuggestions(const string &prefix, int maxResults) const {
    vector<string> results;
    if (prefix.empty())
      return results;
    TrieNode *cur = root;
    for (char c : prefix) {
      if (cur->children.find(c) == cur->children.end())
        return results;
      cur = cur->children[c];
    }
    collectWords(cur, prefix, results, maxResults);
    return results;
  }

  int getWordCount() const { return wordCount; }

private:
  void collectWords(TrieNode *node, string word, vector<string> &res,
                    int max) const {
    if ((int)res.size() >= max)
      return;
    if (node->isEndOfWord)
      res.push_back(word);
    for (auto &p : node->children) {
      collectWords(p.second, word + p.first, res, max);
      if ((int)res.size() >= max)
        return;
    }
  }

  void deleteAll(TrieNode *node) {
    if (!node)
      return;
    for (auto &p : node->children)
      deleteAll(p.second);
    delete node;
  }
};

// ========================= Search History =========================
// Stack-based LIFO storage for past queries — O(1) push/top

class SearchHistory {
public:
  void addQuery(const string &q) {
    if (!q.empty())
      stk.push(q);
  }
  string getLastQuery() const { return stk.empty() ? "" : stk.top(); }

  vector<string> getAllHistory() const {
    vector<string> all;
    stack<string> tmp = stk;
    while (!tmp.empty()) {
      all.push_back(tmp.top());
      tmp.pop();
    }
    return all;
  }

  int getSize() const { return stk.size(); }
  bool isEmpty() const { return stk.empty(); }
  void clear() {
    while (!stk.empty())
      stk.pop();
  }

private:
  stack<string> stk;
};

// ========================= Searcher =========================
// Two methods: linear scan O(N*M) and index lookup O(1)

int countOccurrences(const string &text, const string &query) {
  if (query.empty() || text.empty())
    return 0;
  int count = 0, tLen = text.length(), qLen = query.length();
  for (int i = 0; i <= tLen - qLen; i++) {
    bool match = true;
    for (int j = 0; j < qLen; j++) {
      if (text[i + j] != query[j]) {
        match = false;
        break;
      }
    }
    if (match)
      count++;
  }
  return count;
}

vector<SearchResult> searchLinear(const string &query,
                                  const vector<FileData> &files,
                                  bool caseSens) {
  vector<SearchResult> results;
  string sq = caseSens ? query : toLowercase(query);
  for (int f = 0; f < (int)files.size(); f++) {
    SearchResult r;
    r.fileIndex = f;
    r.fileName = files[f].fileName;
    r.matchCount = 0;
    r.tfidfScore = 0.0;
    for (int l = 0; l < (int)files[f].lines.size(); l++) {
      string sl = caseSens ? files[f].lines[l] : toLowercase(files[f].lines[l]);
      int m = countOccurrences(sl, sq);
      if (m > 0) {
        r.matchCount += m;
        r.matchingLines.push_back({l + 1, files[f].lines[l]});
      }
    }
    if (r.matchCount > 0)
      results.push_back(r);
  }
  return results;
}

vector<SearchResult> searchWithIndex(const string &query,
                                     const InvertedIndex &idx,
                                     const vector<FileData> &files) {
  vector<SearchResult> results;
  vector<string> qw = tokenize(query);
  if (qw.empty())
    return results;

  vector<IndexEntry> entries;
  if (qw.size() == 1)
    entries = idx.lookupWord(qw[0]);
  else
    entries = idx.lookupPhrase(query, files);
  if (entries.empty())
    return results;

  unordered_map<int, SearchResult> fileRes;
  for (const auto &e : entries) {
    if (fileRes.find(e.fileIndex) == fileRes.end()) {
      SearchResult r;
      r.fileIndex = e.fileIndex;
      r.fileName = files[e.fileIndex].fileName;
      r.matchCount = 0;
      r.tfidfScore = 0.0;
      fileRes[e.fileIndex] = r;
    }
    fileRes[e.fileIndex].matchCount++;
    string lt = files[e.fileIndex].lines[e.lineNumber - 1];
    bool dup = false;
    for (const auto &ml : fileRes[e.fileIndex].matchingLines)
      if (ml.first == e.lineNumber) {
        dup = true;
        break;
      }
    if (!dup)
      fileRes[e.fileIndex].matchingLines.push_back({e.lineNumber, lt});
  }
  for (const auto &p : fileRes)
    results.push_back(p.second);
  return results;
}

// ========================= Ranker =========================
// TF-IDF: Term Frequency * Inverse Document Frequency

double calculateTF(int wc, int totalWords) {
  return totalWords == 0 ? 0.0 : (double)wc / totalWords;
}

double calculateIDF(int totalDocs, int docsWithWord) {
  return docsWithWord == 0 ? 0.0 : log((double)totalDocs / docsWithWord);
}

double calculateTFIDF(int wc, int totalWords, int totalDocs, int docsWithWord) {
  return calculateTF(wc, totalWords) * calculateIDF(totalDocs, docsWithWord);
}

void rankByFrequency(vector<SearchResult> &results) {
  sort(results.begin(), results.end(),
       [](const SearchResult &a, const SearchResult &b) {
         return a.matchCount > b.matchCount;
       });
}

void rankByTFIDF(vector<SearchResult> &results, const string &query,
                 const vector<FileData> &files, const InvertedIndex &idx) {
  vector<string> qw = tokenize(query);
  for (int i = 0; i < (int)results.size(); i++) {
    int fi = results[i].fileIndex;
    double score = 0.0;
    for (const string &w : qw)
      score += calculateTFIDF(results[i].matchCount, files[fi].totalWords,
                              idx.totalDocuments, idx.getDocumentFrequency(w));
    results[i].tfidfScore = score;
  }
  sort(results.begin(), results.end(),
       [](const SearchResult &a, const SearchResult &b) {
         return a.tfidfScore > b.tfidfScore;
       });
}

// ========================= Benchmark =========================
// Compares linear vs index search performance

struct BenchmarkResult {
  double linearTimeMs, indexTimeMs;
  int linearCount, indexCount;
  string query;
};

BenchmarkResult runBenchmark(const string &query, const vector<FileData> &files,
                             const InvertedIndex &idx) {
  BenchmarkResult r;
  r.query = query;

  auto t1 = chrono::high_resolution_clock::now();
  auto lr = searchLinear(query, files, false);
  auto t2 = chrono::high_resolution_clock::now();
  r.linearTimeMs = chrono::duration<double, milli>(t2 - t1).count();
  r.linearCount = lr.size();

  auto t3 = chrono::high_resolution_clock::now();
  auto ir = searchWithIndex(query, idx, files);
  auto t4 = chrono::high_resolution_clock::now();
  r.indexTimeMs = chrono::duration<double, milli>(t4 - t3).count();
  r.indexCount = ir.size();

  return r;
}

void displayBenchmark(const BenchmarkResult &r) {
  cout << endl;
  cout << "============================================" << endl;
  cout << "         PERFORMANCE BENCHMARK              " << endl;
  cout << "============================================" << endl;
  cout << "  Query: \"" << r.query << "\"" << endl << endl;
  cout << "  " << left << setw(20) << "Method" << setw(15) << "Time (ms)"
       << setw(15) << "Results" << endl;
  cout << "  " << string(50, '-') << endl;
  cout << "  " << left << setw(20) << "Linear Search" << setw(15) << fixed
       << setprecision(4) << r.linearTimeMs << setw(15) << r.linearCount
       << endl;
  cout << "  " << left << setw(20) << "Index Search" << setw(15) << fixed
       << setprecision(4) << r.indexTimeMs << setw(15) << r.indexCount << endl;
  cout << "  " << string(50, '-') << endl;
  if (r.linearTimeMs > 0 && r.indexTimeMs > 0) {
    double s = r.linearTimeMs / r.indexTimeMs;
    cout << endl;
    if (s > 1.0)
      cout << "  Index search is " << fixed << setprecision(2) << s
           << "x faster!" << endl;
    else
      cout << "  Linear search was faster (small dataset)." << endl;
  }
  cout << endl;
}

// ========================= Display =========================
// Formats and shows results with pagination (5 per page)

const int RESULTS_PER_PAGE = 5;

void printBanner() {
  cout << endl;
  cout << "  ======================================================" << endl;
  cout << "          TEXT SEARCH ENGINE v1.0                        " << endl;
  cout << "  ======================================================" << endl;
  cout << "   A DSA Project by Kafi, Sazid, Azaz & Shuvo           " << endl;
  cout << "  ======================================================" << endl;
  cout << endl;
}

void printSeparator() { cout << "  " << string(54, '-') << endl; }

void displayResults(const vector<SearchResult> &results, const string &query) {
  if (results.empty()) {
    cout << endl
         << "  No results found for \"" << query << "\"" << endl
         << endl;
    return;
  }
  int total = results.size();
  int pages = (total + RESULTS_PER_PAGE - 1) / RESULTS_PER_PAGE;
  int page = 0;

  while (true) {
    int start = page * RESULTS_PER_PAGE;
    int end = min(start + RESULTS_PER_PAGE, total);

    cout << endl;
    cout << "  Found " << total << " file(s) matching \"" << query << "\""
         << endl;
    cout << "  Page " << (page + 1) << " of " << pages << endl;
    printSeparator();

    for (int i = start; i < end; i++) {
      const SearchResult &r = results[i];
      cout << endl
           << "  #" << (i + 1) << "  " << r.fileName
           << "  |  Matches: " << r.matchCount;
      if (r.tfidfScore > 0)
        cout << "  |  TF-IDF: " << fixed << setprecision(4) << r.tfidfScore;
      cout << endl;

      int show = min((int)r.matchingLines.size(), 3);
      for (int j = 0; j < show; j++)
        cout << "    Line " << setw(3) << r.matchingLines[j].first << ": "
             << r.matchingLines[j].second << endl;
      if ((int)r.matchingLines.size() > 3)
        cout << "    ... and " << (r.matchingLines.size() - 3)
             << " more line(s)" << endl;
      printSeparator();
    }

    if (pages <= 1)
      break;
    cout << endl << "  ";
    if (page > 0)
      cout << "[P] Previous  ";
    if (page < pages - 1)
      cout << "[N] Next  ";
    cout << "[Q] Back" << endl << "  Choice: ";
    string ch;
    getline(cin, ch);
    if (ch == "n" || ch == "N") {
      if (page < pages - 1)
        page++;
    } else if (ch == "p" || ch == "P") {
      if (page > 0)
        page--;
    } else
      break;
  }
}

// ========================= Menu =========================
// Main user interaction loop

void showSuggestions(const string &prefix, const Trie &trie) {
  if (prefix.length() < 2)
    return;
  vector<string> sug = trie.getSuggestions(toLowercase(prefix), 5);
  if (!sug.empty()) {
    cout << "  Suggestions: ";
    for (int i = 0; i < (int)sug.size(); i++) {
      cout << sug[i];
      if (i < (int)sug.size() - 1)
        cout << ", ";
    }
    cout << endl;
  }
}

void handleSearch(const vector<FileData> &files, const InvertedIndex &idx,
                  Trie &trie, SearchHistory &hist, bool caseSens) {
  cout << endl;
  cout << (caseSens ? "  Case-Sensitive Search" : "  Search (Case-Insensitive)")
       << endl;
  cout << "  Enter query (or 'back'): ";
  string query;
  getline(cin, query);
  if (query.empty() || query == "back")
    return;

  showSuggestions(query, trie);
  hist.addQuery(query);

  vector<SearchResult> results;
  if (caseSens) {
    results = searchLinear(query, files, true);
  } else {
    results = searchWithIndex(query, idx, files);
    if (results.empty())
      results = searchLinear(query, files, false);
  }
  if (!results.empty())
    rankByTFIDF(results, query, files, idx);
  displayResults(results, query);
}

void handleHistory(const SearchHistory &hist) {
  cout << endl << "  Search History" << endl;
  printSeparator();
  if (hist.isEmpty()) {
    cout << "  No history yet." << endl << endl;
    return;
  }
  vector<string> all = hist.getAllHistory();
  for (int i = 0; i < (int)all.size(); i++)
    cout << "  " << (i + 1) << ". " << all[i] << endl;
  cout << endl << "  Total: " << hist.getSize() << " searches" << endl << endl;
}

void runMenu(vector<FileData> &files, InvertedIndex &idx, Trie &trie,
             SearchHistory &hist) {
  string ch;
  while (true) {
    cout << endl << "  === MAIN MENU ===" << endl << endl;
    cout << "  1. Search (Case-Insensitive)" << endl;
    cout << "  2. Search (Case-Sensitive)" << endl;
    cout << "  3. View Search History" << endl;
    cout << "  4. Run Performance Benchmark" << endl;
    cout << "  5. Rebuild Index" << endl;
    cout << "  6. Show Index Statistics" << endl;
    cout << "  7. Exit" << endl;
    cout << endl << "  Choice (1-7): ";
    getline(cin, ch);

    if (ch == "1")
      handleSearch(files, idx, trie, hist, false);
    else if (ch == "2")
      handleSearch(files, idx, trie, hist, true);
    else if (ch == "3")
      handleHistory(hist);
    else if (ch == "4") {
      cout << endl << "  Enter query to benchmark: ";
      string q;
      getline(cin, q);
      if (!q.empty())
        displayBenchmark(runBenchmark(q, files, idx));
    } else if (ch == "5") {
      cout << endl << "  Enter directory path: ";
      string p;
      getline(cin, p);
      if (!p.empty()) {
        files = loadAllFiles(p);
        if (!files.empty()) {
          idx.buildIndex(files);
          trie = Trie();
          for (const string &w : idx.getAllWords())
            trie.insert(w, idx.getDocumentFrequency(w));
          cout << "  Index rebuilt!" << endl;
        }
      }
    } else if (ch == "6") {
      cout << endl << "  Index Statistics" << endl;
      printSeparator();
      cout << "  Files: " << files.size() << "  |  Words: " << idx.index.size()
           << "  |  Trie: " << trie.getWordCount() << endl
           << endl;
      for (int i = 0; i < (int)files.size(); i++)
        cout << "    " << (i + 1) << ". " << files[i].fileName << " ("
             << files[i].lines.size() << " lines, " << files[i].totalWords
             << " words)" << endl;
      cout << endl;
    } else if (ch == "7") {
      cout << endl << "  Thank you for using Text Search Engine!" << endl;
      cout << "  Project by: Kafi, Sazid, Azaz & Shuvo" << endl << endl;
      break;
    } else
      cout << "  Invalid choice." << endl;
  }
}

// ========================= Main =========================

int main(int argc, char *argv[]) {
  bool jsonMode = false;
  string searchVal = "";
  string searchSensitiveVal = "";
  string autocompleteVal = "";
  string benchmarkVal = "";
  bool statsMode = false;
  string fileContentVal = "";

  // Parse arguments
  for (int i = 2; i < argc; i++) {
    string arg = argv[i];
    if (arg == "--json") {
      jsonMode = true;
      globalJsonMode = true;
    } else if (arg == "--search" && i + 1 < argc) {
      searchVal = argv[++i];
    } else if (arg == "--search-sensitive" && i + 1 < argc) {
      searchSensitiveVal = argv[++i];
    } else if (arg == "--autocomplete" && i + 1 < argc) {
      autocompleteVal = argv[++i];
    } else if (arg == "--benchmark" && i + 1 < argc) {
      benchmarkVal = argv[++i];
    } else if (arg == "--stats") {
      statsMode = true;
    } else if (arg == "--file-content" && i + 1 < argc) {
      fileContentVal = argv[++i];
    }
  }

  if (!jsonMode) {
    printBanner();
  }

  string dir;
  if (argc >= 2) {
    dir = argv[1];
  } else {
    if (jsonMode) {
      cout << "{\"status\":\"error\",\"message\":\"No directory path provided\"}" << endl;
      return 1;
    }
    cout << "  Enter directory path: ";
    getline(cin, dir);
  }

  if (dir.empty()) {
    if (jsonMode) {
      cout << "{\"status\":\"error\",\"message\":\"Directory path is empty\"}" << endl;
    } else {
      cout << "  Error: No path provided." << endl;
      cout << "  Usage: ./search_engine <directory>" << endl;
    }
    return 1;
  }

  if (!jsonMode) {
    cout << endl << "  Loading files..." << endl;
  }
  vector<FileData> files = loadAllFiles(dir);
  if (files.empty()) {
    if (jsonMode) {
      cout << "{\"status\":\"error\",\"message\":\"No files loaded\"}" << endl;
    } else {
      cout << "  No files loaded. Exiting." << endl;
    }
    return 1;
  }

  if (!jsonMode) {
    cout << "  Building inverted index..." << endl;
  }
  InvertedIndex idx;
  idx.buildIndex(files);

  if (!jsonMode) {
    cout << "  Building autocomplete trie..." << endl;
  }
  Trie trie;
  for (const string &w : idx.getAllWords())
    trie.insert(w, idx.getDocumentFrequency(w));
  if (!jsonMode) {
    cout << "  Trie: " << trie.getWordCount() << " words." << endl;
  }

  if (jsonMode) {
    if (!searchVal.empty()) {
      vector<SearchResult> results = searchWithIndex(searchVal, idx, files);
      if (results.empty()) {
        results = searchLinear(searchVal, files, false);
      }
      rankByTFIDF(results, searchVal, files, idx);
      
      cout << "{\"status\":\"success\",\"query\":\"" << escapeJSON(searchVal) << "\",\"results\":[";
      for (size_t i = 0; i < results.size(); i++) {
        if (i > 0) cout << ",";
        const auto &r = results[i];
        cout << "{\"fileName\":\"" << escapeJSON(r.fileName) << "\",";
        cout << "\"matchCount\":" << r.matchCount << ",";
        cout << "\"tfidfScore\":" << r.tfidfScore << ",";
        cout << "\"matchingLines\":[";
        for (size_t j = 0; j < r.matchingLines.size(); j++) {
          if (j > 0) cout << ",";
          cout << "{\"lineNumber\":" << r.matchingLines[j].first << ",";
          cout << "\"text\":\"" << escapeJSON(r.matchingLines[j].second) << "\"}";
        }
        cout << "]}";
      }
      cout << "]}" << endl;
      return 0;
    }
    
    if (!searchSensitiveVal.empty()) {
      vector<SearchResult> results = searchLinear(searchSensitiveVal, files, true);
      rankByTFIDF(results, searchSensitiveVal, files, idx);
      
      cout << "{\"status\":\"success\",\"query\":\"" << escapeJSON(searchSensitiveVal) << "\",\"results\":[";
      for (size_t i = 0; i < results.size(); i++) {
        if (i > 0) cout << ",";
        const auto &r = results[i];
        cout << "{\"fileName\":\"" << escapeJSON(r.fileName) << "\",";
        cout << "\"matchCount\":" << r.matchCount << ",";
        cout << "\"tfidfScore\":" << r.tfidfScore << ",";
        cout << "\"matchingLines\":[";
        for (size_t j = 0; j < r.matchingLines.size(); j++) {
          if (j > 0) cout << ",";
          cout << "{\"lineNumber\":" << r.matchingLines[j].first << ",";
          cout << "\"text\":\"" << escapeJSON(r.matchingLines[j].second) << "\"}";
        }
        cout << "]}";
      }
      cout << "]}" << endl;
      return 0;
    }
    
    if (!autocompleteVal.empty()) {
      vector<string> sug = trie.getSuggestions(toLowercase(autocompleteVal), 10);
      cout << "{\"status\":\"success\",\"prefix\":\"" << escapeJSON(autocompleteVal) << "\",\"suggestions\":[";
      for (size_t i = 0; i < sug.size(); i++) {
        if (i > 0) cout << ",";
        cout << "\"" << escapeJSON(sug[i]) << "\"";
      }
      cout << "]}" << endl;
      return 0;
    }
    
    if (!benchmarkVal.empty()) {
      BenchmarkResult r = runBenchmark(benchmarkVal, files, idx);
      double speedup = r.indexTimeMs > 0 ? (r.linearTimeMs / r.indexTimeMs) : 0;
      cout << "{\"status\":\"success\",\"query\":\"" << escapeJSON(benchmarkVal) << "\",";
      cout << "\"linearTimeMs\":" << r.linearTimeMs << ",";
      cout << "\"indexTimeMs\":" << r.indexTimeMs << ",";
      cout << "\"linearCount\":" << r.linearCount << ",";
      cout << "\"indexCount\":" << r.indexCount << ",";
      cout << "\"speedup\":" << speedup << "}" << endl;
      return 0;
    }
    
    if (statsMode) {
      cout << "{\"status\":\"success\",\"documentCount\":" << files.size() << ",";
      cout << "\"uniqueWords\":" << idx.index.size() << ",";
      cout << "\"trieWordCount\":" << trie.getWordCount() << ",";
      cout << "\"files\":[";
      for (size_t i = 0; i < files.size(); i++) {
        if (i > 0) cout << ",";
        cout << "{\"fileName\":\"" << escapeJSON(files[i].fileName) << "\",";
        cout << "\"linesCount\":" << files[i].lines.size() << ",";
        cout << "\"wordCount\":" << files[i].totalWords << "}";
      }
      cout << "]}" << endl;
      return 0;
    }
    
    if (!fileContentVal.empty()) {
      int fi = -1;
      for (int i = 0; i < (int)files.size(); i++) {
        if (files[i].fileName == fileContentVal) {
          fi = i;
          break;
        }
      }
      if (fi == -1) {
        cout << "{\"status\":\"error\",\"message\":\"File not found\"}" << endl;
        return 1;
      }
      cout << "{\"status\":\"success\",\"fileName\":\"" << escapeJSON(files[fi].fileName) << "\",";
      cout << "\"totalWords\":" << files[fi].totalWords << ",";
      cout << "\"lines\":[";
      for (size_t i = 0; i < files[fi].lines.size(); i++) {
        if (i > 0) cout << ",";
        cout << "\"" << escapeJSON(files[fi].lines[i]) << "\"";
      }
      cout << "]}" << endl;
      return 0;
    }
    
    cout << "{\"status\":\"error\",\"message\":\"Unknown command-line options\"}" << endl;
    return 1;
  }

  SearchHistory hist;
  cout << endl << "  Ready!" << endl;
  runMenu(files, idx, trie, hist);
  return 0;
}
