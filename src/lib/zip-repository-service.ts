import JSZip from "jszip";

export interface RepoFile {
  path: string;
  name: string;
  content: string;
  size: number;
  isDirectory: boolean;
}

export interface RepoTree {
  files: RepoFile[];
  rootName: string;
  totalSize: number;
  fileCount: number;
}

export async function extractZipRepository(file: File): Promise<RepoTree> {
  const zip = await JSZip.loadAsync(file);
  const files: RepoFile[] = [];
  let totalSize = 0;

  const entries = Object.entries(zip.files).sort(([a], [b]) => a.localeCompare(b));

  // Detect common root prefix
  const paths = entries.map(([p]) => p);
  const firstSegments = paths.map((p) => p.split("/")[0]);
  const commonRoot = firstSegments.every((s) => s === firstSegments[0]) ? firstSegments[0] : "";

  for (const [relativePath, zipEntry] of entries) {
    const displayPath = commonRoot ? relativePath.replace(`${commonRoot}/`, "") : relativePath;
    if (!displayPath) continue;

    if (zipEntry.dir) {
      files.push({
        path: displayPath.replace(/\/$/, ""),
        name: displayPath.replace(/\/$/, "").split("/").pop() || displayPath,
        content: "",
        size: 0,
        isDirectory: true,
      });
    } else {
      const content = await zipEntry.async("string");
      totalSize += content.length;
      files.push({
        path: displayPath,
        name: displayPath.split("/").pop() || displayPath,
        content,
        size: content.length,
        isDirectory: false,
      });
    }
  }

  return {
    files,
    rootName: commonRoot || file.name.replace(/\.zip$/i, ""),
    totalSize,
    fileCount: files.filter((f) => !f.isDirectory).length,
  };
}

export function getFileLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", rs: "rust", go: "go", rb: "ruby", java: "java",
    css: "css", scss: "css", html: "html", json: "json", yaml: "yaml",
    yml: "yaml", md: "markdown", sql: "sql", sh: "shell", bash: "shell",
    toml: "toml", xml: "xml", svg: "xml",
  };
  return map[ext] || "text";
}

export function buildFileTree(files: RepoFile[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", children: [], isDirectory: true };

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          children: [],
          isDirectory: isLast ? file.isDirectory : true,
          file: isLast && !file.isDirectory ? file : undefined,
        };
        current.children.push(child);
      }
      current = child;
    }
  }

  const sortNodes = (nodes: TreeNode[]): TreeNode[] =>
    nodes.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    }).map((n) => ({ ...n, children: sortNodes(n.children) }));

  return sortNodes(root.children);
}

export interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  isDirectory: boolean;
  file?: RepoFile;
}
