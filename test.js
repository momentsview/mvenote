const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

class Element {
  constructor(tagName = "div") {
    this.tagName = tagName;
    this.children = [];
    this.className = "";
    this.dataset = {};
    this.disabled = false;
    this.eventHandlers = {};
    this.textContent = "";
    this.type = "";
    this.value = "";
  }

  append(...nodes) {
    this.children.push(...nodes);
  }

  appendChild(node) {
    this.children.push(node);
  }

  addEventListener(type, handler) {
    this.eventHandlers[type] = handler;
  }

  trigger(type, event = { target: this }) {
    this.eventHandlers[type]?.(event);
  }

  focus() {}

  set innerHTML(value) {
    this.children = [];
    this.textContent = value;
  }
}

const ids = {
  notesList: new Element("section"),
  newNote: new Element("button"),
  deleteNote: new Element("button"),
  searchNotes: new Element("input"),
  noteTitle: new Element("input"),
  noteContent: new Element("textarea"),
  statusText: new Element("div")
};

const html = fs.readFileSync("index.html", "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
assert.ok(script, "index.html should include an app script");
assert.ok(html.includes("grid-template-columns: minmax(260px, 340px) minmax(0, 1fr)"));
assert.ok(html.includes('class="notes-list"'));
assert.ok(html.includes('class="editor"'));

const storage = {};
const context = {
  console,
  clearTimeout() {},
  confirm: () => true,
  crypto: {
    randomUUID: (() => {
      let count = 0;
      return () => `note-${++count}`;
    })()
  },
  document: {
    createElement: (tagName) => new Element(tagName),
    getElementById: (id) => ids[id]
  },
  Intl,
  localStorage: {
    getItem: (key) => storage[key] ?? null,
    setItem: (key, value) => {
      storage[key] = value;
    }
  },
  setTimeout: (handler) => {
    handler();
    return 1;
  }
};

vm.runInNewContext(script, context);

let saved = JSON.parse(storage["mvenote.notes"]);
assert.equal(saved.length, 1, "first load should create one blank note");
assert.equal(ids.notesList.children.length, 1, "first note should render in the note list");
assert.equal(ids.statusText.textContent, "All changes saved");

ids.newNote.trigger("click");
saved = JSON.parse(storage["mvenote.notes"]);
assert.equal(saved.length, 2, "new note button should create a note");

ids.noteTitle.value = "Meeting Notes";
ids.noteTitle.trigger("input");
ids.noteContent.value = "Discuss launch tasks and owners.";
ids.noteContent.trigger("input");
saved = JSON.parse(storage["mvenote.notes"]);
assert.equal(saved[0].title, "Meeting Notes");
assert.equal(saved[0].content, "Discuss launch tasks and owners.");

ids.searchNotes.value = "launch";
ids.searchNotes.trigger("input");
assert.equal(ids.notesList.children.length, 1, "search should filter matching notes");
assert.equal(ids.notesList.children[0].children[0].textContent, "Meeting Notes");

ids.deleteNote.trigger("click");
saved = JSON.parse(storage["mvenote.notes"]);
assert.equal(saved.length, 1, "delete should remove the active note");

console.log("All tests passed");
