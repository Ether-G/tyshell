import { File, Directory, FileSystem as IFileSystem, FileSystemNode } from './types';

export class FileSystem implements IFileSystem {
    private root: Directory;
    private currentDirectory: Directory;
    private currentPath: string;

    constructor() {
        this.root = {
            name: '/',
            type: 'directory',
            children: new Map(),
            modifiedAt: new Date(),
            createdAt: new Date(),
            path: '/',
            parent: null
        };
        this.currentDirectory = this.root;
        this.currentPath = '/';
    }

    public isDirectory(node: FileSystemNode): node is Directory {
        return node.type === 'directory';
    }

    public isFile(node: FileSystemNode): node is File {
        return node.type === 'file';
    }

    public resolvePath(path: string): string {
        let fullPath = path.startsWith('/') ? path : (this.currentPath === '/' ? `/${path}` : `${this.currentPath}/${path}`);
        const parts = fullPath.split('/');
        const stack: string[] = [];
        for (const part of parts) {
            if (part === '' || part === '.') continue;
            if (part === '..') {
                if (stack.length > 0) stack.pop();
            } else {
                stack.push(part);
            }
        }
        return '/' + stack.join('/');
    }

    public dirname(path: string): string {
        const parts = path.split('/').filter(Boolean);
        if (parts.length === 0) return '/';
        parts.pop();
        return '/' + parts.join('/');
    }

    public basename(path: string): string {
        const parts = path.split('/').filter(Boolean);
        return parts[parts.length - 1] || '';
    }

    public getNode(path: string): FileSystemNode | null {
        const absolutePath = this.resolvePath(path);
        if (absolutePath === '/') return this.root;
        const parts = absolutePath.split('/').filter(Boolean);
        let current: FileSystemNode = this.root;
        for (const part of parts) {
            if (!this.isDirectory(current)) return null;
            const next = current.children.get(part);
            if (!next) return null;
            current = next;
        }
        return current;
    }

    public getCurrentPath(): string {
        return this.currentPath;
    }

    public getCurrentDirectory(): Directory {
        return this.currentDirectory;
    }

    public createFile(path: string, content: string, overwrite: boolean = false): void {
        const absolutePath = this.resolvePath(path);
        const parentPath = this.dirname(absolutePath);
        const fileName = this.basename(absolutePath);
        const parent = this.getNode(parentPath);
        if (!parent || !this.isDirectory(parent)) {
            throw new Error(`Parent directory not found: ${parentPath}`);
        }
        if (parent.children.has(fileName) && !overwrite) {
            throw new Error(`File already exists: ${fileName}`);
        }
        const file: File = {
            name: fileName,
            type: 'file',
            content,
            size: content.length,
            modifiedAt: new Date(),
            createdAt: new Date(),
            path: absolutePath,
            parent: parentPath
        };
        parent.children.set(fileName, file);
    }

    public createDirectory(path: string): void {
        const absolutePath = this.resolvePath(path);
        const parentPath = this.dirname(absolutePath);
        const dirName = this.basename(absolutePath);
        const parent = this.getNode(parentPath);
        if (!parent || !this.isDirectory(parent)) {
            throw new Error(`Parent directory not found: ${parentPath}`);
        }
        if (parent.children.has(dirName)) {
            throw new Error(`Directory already exists: ${dirName}`);
        }
        const dir: Directory = {
            name: dirName,
            type: 'directory',
            children: new Map(),
            modifiedAt: new Date(),
            createdAt: new Date(),
            path: absolutePath,
            parent: parentPath
        };
        parent.children.set(dirName, dir);
    }

    public removeFile(path: string): void {
        const absolutePath = this.resolvePath(path);
        const parentPath = this.dirname(absolutePath);
        const fileName = this.basename(absolutePath);
        const parent = this.getNode(parentPath);
        if (!parent || !this.isDirectory(parent)) {
            throw new Error(`Parent directory not found: ${parentPath}`);
        }
        const file = parent.children.get(fileName);
        if (!file || !this.isFile(file)) {
            throw new Error(`File not found: ${fileName}`);
        }
        parent.children.delete(fileName);
    }

    public removeDirectory(path: string): void {
        const absolutePath = this.resolvePath(path);
        const parentPath = this.dirname(absolutePath);
        const dirName = this.basename(absolutePath);
        const parent = this.getNode(parentPath);
        if (!parent || !this.isDirectory(parent)) {
            throw new Error(`Parent directory not found: ${parentPath}`);
        }
        const dir = parent.children.get(dirName);
        if (!dir || !this.isDirectory(dir)) {
            throw new Error(`Directory not found: ${dirName}`);
        }
        if (dir.children.size > 0) {
            throw new Error(`Directory not empty: ${dirName}`);
        }
        parent.children.delete(dirName);
    }

    public moveFile(source: string, destination: string): void {
        const sourcePath = this.resolvePath(source);
        const destPath = this.resolvePath(destination);
        const sourceNode = this.getNode(sourcePath);
        const destParent = this.getNode(this.dirname(destPath));
        if (!sourceNode || !this.isFile(sourceNode)) {
            throw new Error(`Source file not found: ${source}`);
        }
        if (!destParent || !this.isDirectory(destParent)) {
            throw new Error(`Destination directory not found: ${this.dirname(destination)}`);
        }
        // Remove from source
        const sourceParent = this.getNode(sourceNode.parent!);
        if (sourceParent && this.isDirectory(sourceParent)) {
            sourceParent.children.delete(this.basename(sourcePath));
        }
        // Add to destination
        sourceNode.path = destPath;
        sourceNode.parent = destParent.path;
        destParent.children.set(this.basename(destPath), sourceNode);
    }

    public moveDirectory(source: string, destination: string): void {
        const sourcePath = this.resolvePath(source);
        const destPath = this.resolvePath(destination);
        const sourceNode = this.getNode(sourcePath);
        const destParent = this.getNode(this.dirname(destPath));
        if (!sourceNode || !this.isDirectory(sourceNode)) {
            throw new Error(`Source directory not found: ${source}`);
        }
        if (!destParent || !this.isDirectory(destParent)) {
            throw new Error(`Destination directory not found: ${this.dirname(destination)}`);
        }
        // Remove from source
        const sourceParent = this.getNode(sourceNode.parent!);
        if (sourceParent && this.isDirectory(sourceParent)) {
            sourceParent.children.delete(this.basename(sourcePath));
        }
        // Add to destination
        sourceNode.path = destPath;
        sourceNode.parent = destParent.path;
        destParent.children.set(this.basename(destPath), sourceNode);
    }

    public copyFile(source: string, destination: string): void {
        const sourcePath = this.resolvePath(source);
        const destPath = this.resolvePath(destination);
        const sourceNode = this.getNode(sourcePath);
        const destParent = this.getNode(this.dirname(destPath));
        if (!sourceNode || !this.isFile(sourceNode)) {
            throw new Error(`Source file not found: ${source}`);
        }
        if (!destParent || !this.isDirectory(destParent)) {
            throw new Error(`Destination directory not found: ${this.dirname(destination)}`);
        }
        const newFile: File = {
            ...sourceNode,
            path: destPath,
            parent: destParent.path,
            modifiedAt: new Date(),
            createdAt: new Date()
        };
        destParent.children.set(this.basename(destPath), newFile);
    }

    public copyDirectory(source: string, destination: string): void {
        const sourcePath = this.resolvePath(source);
        const destPath = this.resolvePath(destination);
        const sourceNode = this.getNode(sourcePath);
        const destParent = this.getNode(this.dirname(destPath));
        if (!sourceNode || !this.isDirectory(sourceNode)) {
            throw new Error(`Source directory not found: ${source}`);
        }
        if (!destParent || !this.isDirectory(destParent)) {
            throw new Error(`Destination directory not found: ${this.dirname(destination)}`);
        }
        const newDir: Directory = {
            ...sourceNode,
            path: destPath,
            parent: destParent.path,
            modifiedAt: new Date(),
            createdAt: new Date(),
            children: new Map(sourceNode.children)
        };
        destParent.children.set(this.basename(destPath), newDir);
    }

    public changeDirectory(path: string): void {
        const absolutePath = this.resolvePath(path);
        const node = this.getNode(absolutePath);
        if (!node || !this.isDirectory(node)) {
            throw new Error(`Directory not found: ${path}`);
        }
        this.currentDirectory = node;
        this.currentPath = absolutePath;
    }

    public listDirectory(path: string): FileSystemNode[] {
        const absolutePath = this.resolvePath(path);
        const node = this.getNode(absolutePath);
        if (!node || !this.isDirectory(node)) {
            throw new Error(`Directory not found: ${path}`);
        }
        return Array.from(node.children.values());
    }
}
