# Text Search Engine - System Overview

This document provides a comprehensive overview of the Text Search Engine system implemented in this workspace.

---

## 📂 Project Structure

The project consists of the following key components:

*   **[`main.cpp`](file:///Users/shuvochakma/Search_Engine_Latest/main.cpp)**: The primary source file containing the complete implementation of the text search engine, including indexing data structures, query processing algorithms, ranking logic, benchmarking tools, and the command-line interface.
*   **`main`**: The compiled executable of the search engine.
*   **[`test_files/`](file:///Users/shuvochakma/Search_Engine_Latest/test_files)**: A directory containing 55 test text documents (`.txt` files) on varied topics such as algorithms, hardware components (CPU, SSD, GPU), fruits (apple, mango, blueberry), and major global cities (Cairo, Paris, Tokyo). These serve as the document corpus for search indexing and testing.

---

## 🛠️ Key Architectural Components

The search engine is written in standard C++17 and relies on classical data structures for efficient text processing and retrieval:

### 1. Data Representation & Structures
*   **`FileData`**: Represents loaded text files.
    *   `filePath` & `fileName`: Location and name of the file.
    *   `lines`: Vector storing each line of the document as a separate string for quick retrieval during pagination.
    *   `totalWords`: The word count of the file, used for calculating Term Frequency (TF).
*   **`SearchResult`**: Represents a match found within a file.
    *   `fileIndex` & `fileName`: Contextual details of the matching file.
    *   `matchCount`: Total occurrences of the term/phrase.
    *   `tfidfScore`: Relevancy ranking score.
    *   `matchingLines`: A list of pairs containing line numbers and their corresponding line content for display.

### 2. Tokenizer & Stopword Processing
*   **Tokenizer**: Breaks input lines into individual, lowercase, alphanumeric-only tokens.
*   **Stopword Filter**: Eliminates 93 high-frequency grammatical words (e.g., "the", "and", "is", "of") to keep the index clean, reduce memory consumption, and ignore noise during ranking. It uses a static `std::unordered_set<std::string>` for $O(1)$ lookups.

### 3. Inverted Index
*   **Structure**: Uses a hash map (`std::unordered_map<std::string, std::vector<IndexEntry>>`) mapping each distinct word to a list of its occurrences (containing `fileIndex` and `lineNumber`).
*   **Search Acceleration**: 
    *   **Single-Word**: Returns the entries directly from the hash map in average $O(1)$ time.
    *   **Phrase Search**: Looks up files containing all words in the phrase first (performing set intersections), then verifies if the exact phrase sequence exists sequentially in those candidate files.

### 4. Autocomplete Trie (Prefix Tree)
*   **Structure**: An autocomplete prefix tree (`Trie`) that maps word hierarchies using character nodes.
*   **Functionality**: Suggests matching words as the user types queries (requires at least 2 characters). The suggestions are retrieved via a Depth-First Search (DFS) from the prefix node.

### 5. Search History Stack
*   **Structure**: Stack-based LIFO storage.
*   **Functionality**: Stores queries in a stack to view the list of recently queried terms.

### 6. Relevance Ranking (TF-IDF)
The engine ranks documents by relevance using the **TF-IDF** (Term Frequency-Inverse Document Frequency) algorithm:
$$\text{TF}(t, d) = \frac{\text{Count of } t \text{ in } d}{\text{Total words in } d}$$
$$\text{IDF}(t, D) = \ln\left(\frac{\text{Total documents in } D}{\text{Documents containing } t}\right)$$
$$\text{TF-IDF}(t, d, D) = \text{TF}(t, d) \times \text{IDF}(t, D)$$
Results are sorted in descending order of their cumulative TF-IDF score.

---

## 📈 Performance Benchmarking
A built-in performance benchmark compares **Linear Search** against **Index-based Search**:
*   **Linear Search**: Scans every line of every file manually using `std::string::find` ($O(N \times M)$ complexity, where $N$ is document lines and $M$ is query length).
*   **Index Search**: Employs the `InvertedIndex` for instantaneous lookup.
*   The console displays time elapsed in milliseconds (ms) for both strategies, showing speedup comparisons (often $100\times$+ faster using the index on larger datasets).

---

## 🖥️ Command-Line Interface (CLI)

The interactive terminal menu supports the following options:
1.  **Search (Case-Insensitive)**: Default index-based search with autocomplete suggestions and TF-IDF ranking.
2.  **Search (Case-Sensitive)**: Case-aware linear search.
3.  **View Search History**: Displays the list of previous queries.
4.  **Run Performance Benchmark**: Executes a query on both search paths and prints performance statistics.
5.  **Rebuild Index**: Reloads files from a given directory path and reconstructs both the Inverted Index and Autocomplete Trie.
6.  **Show Index Statistics**: Lists loaded files, total lines, document word counts, and size of the index/trie.
7.  **Exit**: Gracefully exits the application.

---

## ⚙️ How to Compile & Run

### Compilation
Ensure a C++17 compliant compiler is installed:
```bash
g++ -std=c++17 -o search_engine main.cpp
```

### Execution
Run the compiled executable passing the test files directory as an argument:
```bash
./search_engine ./test_files
```
