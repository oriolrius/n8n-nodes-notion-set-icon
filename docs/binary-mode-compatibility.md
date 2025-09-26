# 📑 n8n Binary Mode Compatibility Report

**Subject:** Comparison of two custom nodes with `N8N_DEFAULT_BINARY_DATA_MODE=filesystem`

---

## ✅ Verdict

* **Compatible:** `NotionUploadMedia.node.ts` — uses

  ```ts
  const fileBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
  ```

  This works with both in-memory and filesystem/S3 binary storage.

* **Not Compatible (FIXED):** `NotionSetIcon.node.ts` — previously used

  ```ts
  const fileBuffer = Buffer.from(binaryData.data, 'base64');
  ```

  This assumed base64 inside the JSON payload, which breaks in filesystem/S3 modes.

  **Fixed to use:**
  ```ts
  const fileBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
  ```

---

## 🔎 Why this matters

When `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` is enabled, n8n stores file content **outside** the item JSON (on disk or S3).
If a node expects the base64 inline representation, it fails for large files. Nodes must use n8n's **helper API** (`getBinaryDataBuffer`) to load the real bytes.

---

## 📂 File-by-file analysis

### 1) `NotionSetIcon.node.ts` (✅ Now Compatible)

**Previous code (❌ Not compatible):**

```ts
const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
// ❌ Converts from base64 string in JSON
const fileBuffer = Buffer.from(binaryData.data, 'base64');
```

**Why it broke:**

* In filesystem mode, the binary data is not in JSON anymore.
* `Buffer.from(..., 'base64')` ends up converting only the preview or fails for huge files.

**Fix applied:**

```diff
- const fileBuffer = Buffer.from(binaryData.data, 'base64');
+ const fileBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
```

---

### 2) `NotionUploadMedia.node.ts` (✅ Compatible)

**Current code:**

```ts
const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
// ✅ Correct: works with filesystem or memory
const fileBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
```

**Why it works:**

* Uses the helper, which automatically pulls bytes from memory, disk, or S3 depending on configuration.

---

## 📊 Data processing comparison

| Step                  | NotionSetIcon (before)                       | NotionSetIcon (after)                        | NotionUploadMedia                            |
| --------------------- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| Read binary from item | `assertBinaryData` → `Buffer.from(base64)` ❌ | `assertBinaryData` → `getBinaryDataBuffer` ✅ | `assertBinaryData` → `getBinaryDataBuffer` ✅ |
| Works with filesystem | No                                           | Yes                                          | Yes                                          |
| Upload step           | FormData append                              | FormData append                              | FormData append                              |

---

## 🛠️ Impact

This single-line change makes `NotionSetIcon.node.ts` storage-mode agnostic and enables it to:
- Handle large files properly
- Work with `N8N_DEFAULT_BINARY_DATA_MODE=filesystem`
- Work with S3 binary storage
- Maintain backward compatibility with in-memory mode