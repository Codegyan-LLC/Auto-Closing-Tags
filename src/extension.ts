'use strict';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    vscode.workspace.onDidChangeTextDocument(event => {
        insertAutoCloseTag(event);
    });

    let closeTag = vscode.commands.registerCommand('auto-close-tag.closeTag', () => {
        insertCloseTag();
    });

    context.subscriptions.push(closeTag);
}

export function deactivate() {}

function insertAutoCloseTag(event: vscode.TextDocumentChangeEvent): void {
    if (!event.contentChanges[0] || 
        (event.reason && event.reason === vscode.TextDocumentChangeReason.Undo) || 
        (event.reason && event.reason === vscode.TextDocumentChangeReason.Redo)) {
        return;
    }

    let editor = vscode.window.activeTextEditor;
    if (!editor || event.document !== editor.document) return;

    const config = vscode.workspace.getConfiguration('auto-close-tag', editor.document.uri);
    if (!config.get<boolean>("enableAutoCloseTag", true)) return;

    const languageId = editor.document.languageId;
    const languages = config.get<string[]>("activationOnLanguage", ["*"]);
    const disableOnLanguage = config.get<string[]>("disableOnLanguage", []);
    if (!languages.includes("*") && !languages.includes(languageId) || disableOnLanguage.includes(languageId)) {
        return;
    }

    const excludedTags = config.get<string[]>("excludedTags", []);
    const isRightAngleBracket = event.contentChanges[0].text === ">";
    const position = editor.selection.start.translate(0, 1);

    if (isRightAngleBracket) {
        const lineText = editor.document.lineAt(position.line).text.substring(0, position.character);
        const match = /<([a-zA-Z0-9\-_]+)([^>]*)>$/.exec(lineText);
        if (match && !excludedTags.includes(match[1].toLowerCase())) {
            editor.edit(editBuilder => {
                editBuilder.insert(position, `</${match[1]}>`);
            }).then(() => {
                editor.selection = new vscode.Selection(position, position);
            });
        }
    }
}

function insertCloseTag(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const position = editor.selection.start;
    const excludedTags = vscode.workspace.getConfiguration('auto-close-tag', editor.document.uri).get<string[]>("excludedTags", []);
    const text = editor.document.getText(new vscode.Range(new vscode.Position(0, 0), position));

    const match = /<([a-zA-Z0-9\-_]+)([^>]*)>$/.exec(text);
    if (match && !excludedTags.includes(match[1].toLowerCase())) {
        editor.edit(editBuilder => {
            editBuilder.insert(position, `</${match[1]}>`);
        });
    }
}