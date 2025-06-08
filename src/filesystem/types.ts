export interface FileSystemNode {
    name: string;
    type: 'file' | 'directory';
    path: string;
    parent: string | null;
    modifiedAt: Date;
    createdAt: Date;
}

export interface File extends FileSystemNode {
    type: 'file';
    content: string;
    size: number;
}

export interface Directory extends FileSystemNode {
    type: 'directory';
    children: Map<string, FileSystemNode>;
}

export interface FileSystem {
    isDirectory(node: FileSystemNode): node is Directory;
    isFile(node: FileSystemNode): node is File;
    resolvePath(path: string): string;
    dirname(path: string): string;
    basename(path: string): string;
    getNode(path: string): FileSystemNode | null;
    getCurrentPath(): string;
    getCurrentDirectory(): Directory;
    createFile(path: string, content: string): void;
    createDirectory(path: string): void;
    removeFile(path: string): void;
    removeDirectory(path: string): void;
    moveFile(source: string, destination: string): void;
    moveDirectory(source: string, destination: string): void;
    copyFile(source: string, destination: string): void;
    copyDirectory(source: string, destination: string): void;
} 