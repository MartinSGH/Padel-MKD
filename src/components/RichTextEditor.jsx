import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useEditor, EditorContent } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TableKit } from "@tiptap/extension-table";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import { Placeholder, CharacterCount } from "@tiptap/extensions";
import Youtube from "@tiptap/extension-youtube";
import { ColorPicker } from "antd";
import {
  LuUndo2,
  LuRedo2,
  LuBold,
  LuItalic,
  LuUnderline,
  LuStrikethrough,
  LuSubscript,
  LuSuperscript,
  LuCode,
  LuRemoveFormatting,
  LuAlignLeft,
  LuAlignCenter,
  LuAlignRight,
  LuAlignJustify,
  LuList,
  LuListOrdered,
  LuListTodo,
  LuQuote,
  LuSquareCode,
  LuMinus,
  LuLink,
  LuUnlink,
  LuImage,
  LuPaperclip,
  LuTable,
  LuYoutube,
  LuHighlighter,
  LuBaseline,
  LuIndentIncrease,
  LuIndentDecrease,
  LuTrash2,
} from "react-icons/lu";
import "../styles/RichTextEditor.css";

// Word-like rich text editor for news articles (TipTap). Value in / out is HTML.
// Images and attachments are uploaded through `onUpload(file, folder)`, which
// must resolve to a public URL — nothing is stored as base64 in the HTML.

// Image node with a block alignment, stored as data-align on the <img>.
const AlignedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "center",
        parseHTML: (el) => el.getAttribute("data-align") || "center",
        renderHTML: (attrs) => ({ "data-align": attrs.align }),
      },
    };
  },
});

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Montserrat", value: "Montserrat, sans-serif" },
  { label: "Titillium Web", value: "'Titillium Web', sans-serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
];

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64];

const LINE_HEIGHTS = ["1", "1.15", "1.5", "2", "2.5"];

const COLOR_PRESETS = [
  {
    label: "Federation",
    colors: ["#081738", "#1d3163", "#274696", "#f82428", "#fde834", "#d4a63d"],
  },
  {
    label: "Basic",
    colors: [
      "#000000",
      "#434343",
      "#999999",
      "#ffffff",
      "#e03131",
      "#f08c00",
      "#2f9e44",
      "#1971c2",
      "#7048e8",
      "#c2255c",
    ],
  },
];

const HIGHLIGHT_PRESETS = [
  {
    label: "Highlight",
    colors: ["#fff3bf", "#fde834", "#d3f9d8", "#d0ebff", "#ffe3e3", "#e5dbff"],
  },
];

// Table toolbar: [label, chain => chain.command()].
const TABLE_ACTIONS = [
  ["+ Row above", (c) => c.addRowBefore()],
  ["+ Row below", (c) => c.addRowAfter()],
  ["+ Column left", (c) => c.addColumnBefore()],
  ["+ Column right", (c) => c.addColumnAfter()],
  ["− Row", (c) => c.deleteRow()],
  ["− Column", (c) => c.deleteColumn()],
];

const Btn = ({ icon: Icon, label, active, disabled, onClick }) => (
  <button
    type="button"
    className={`rte-btn${active ? " is-active" : ""}`}
    title={label}
    aria-label={label}
    aria-pressed={active}
    disabled={disabled}
    // Keep the editor selection while clicking toolbar buttons.
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
  >
    <Icon size={17} />
  </button>
);

Btn.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  active: PropTypes.bool,
  disabled: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};

const Sep = () => <span className="rte-sep" aria-hidden="true" />;

const RichTextEditor = ({ value, onChange, onUpload, placeholder }) => {
  const [uploading, setUploading] = useState(0); // uploads in flight
  const [uploadError, setUploadError] = useState("");
  // Inline URL prompt for links, images by URL and YouTube embeds.
  const [prompt, setPrompt] = useState(null); // { kind, value }
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  // editorProps are bound once, so paste/drop handlers read the latest upload fn.
  const uploadRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
        },
      }),
      TextStyleKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      AlignedImage.configure({
        resize: {
          enabled: true,
          directions: ["top-left", "top-right", "bottom-left", "bottom-right"],
          minWidth: 60,
          minHeight: 40,
          alwaysPreserveAspectRatio: true,
        },
      }),
      Subscript,
      Superscript,
      TableKit.configure({ table: { resizable: true } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Youtube.configure({ nocookie: true, width: 640, height: 360 }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content: value || "",
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: ed }) => onChange(ed.isEmpty ? "" : ed.getHTML()),
    editorProps: {
      attributes: { class: "rte-content news-prose" },
      handlePaste: (view, event) => {
        const files = [...(event.clipboardData?.files || [])].filter((f) =>
          f.type.startsWith("image/"),
        );
        if (!files.length) return false;
        uploadRef.current?.(files, "image");
        return true;
      },
      handleDrop: (view, event, slice, moved) => {
        const files = [...(event.dataTransfer?.files || [])];
        if (moved || !files.length) return false;
        event.preventDefault();
        const coords = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });
        uploadRef.current?.(files, "auto", coords?.pos);
        return true;
      },
    },
  });

  // Load a different article into the same editor (e.g. switching Edit target).
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if ((value || "") !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  // Uploads files and inserts them: images inline, anything else as a link.
  // kind "image" | "file" | "auto"; `pos` is an optional insert position.
  const uploadAndInsert = async (files, kind, pos) => {
    if (!editor) return;
    setUploadError("");
    for (const file of files) {
      const isImage =
        kind === "image" || (kind === "auto" && file.type.startsWith("image/"));
      setUploading((n) => n + 1);
      try {
        const url = await onUpload(file, isImage ? "images" : "attachments");
        const chain = editor.chain().focus();
        if (pos != null) chain.setTextSelection(pos);
        if (isImage) {
          chain
            .setImage({ src: url, alt: file.name.replace(/\.[^.]+$/, "") })
            // The new image is left selected; put the cursor in a paragraph
            // after it so the next upload / typing doesn't replace it.
            .command(({ tr }) => {
              const after = tr.selection.to;
              if (!tr.doc.resolve(after).nodeAfter?.isTextblock) {
                tr.insert(after, tr.doc.type.schema.nodes.paragraph.create());
              }
              tr.setSelection(TextSelection.create(tr.doc, after + 1));
              return true;
            });
        } else {
          chain.insertContent([
            {
              type: "text",
              text: `📎 ${file.name}`,
              marks: [{ type: "link", attrs: { href: url, target: "_blank" } }],
            },
            { type: "text", text: " " },
          ]);
        }
        chain.run();
        pos = undefined; // following files go after the first one
      } catch (e) {
        setUploadError(e.message || "Upload failed.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };
  uploadRef.current = uploadAndInsert;

  if (!editor) return null;

  const imageSelected = editor.isActive("image");
  const inTable = editor.isActive("table");
  const textStyle = editor.getAttributes("textStyle");
  const currentSize = (textStyle.fontSize || "").replace("px", "");
  const currentFamily = textStyle.fontFamily || "";
  const currentLineHeight = textStyle.lineHeight || "";

  const blockType = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : editor.isActive("heading", { level: 4 })
          ? "h4"
          : "p";

  const setBlockType = (type) => {
    const chain = editor.chain().focus();
    if (type === "p") chain.setParagraph().run();
    else chain.setHeading({ level: Number(type.slice(1)) }).run();
  };

  // Alignment buttons align the selected image, or the text otherwise.
  const align = (dir) => {
    if (imageSelected) {
      editor
        .chain()
        .focus()
        .updateAttributes("image", {
          align: dir === "justify" ? "center" : dir,
        })
        .run();
    } else {
      editor.chain().focus().setTextAlign(dir).run();
    }
  };
  const isAligned = (dir) =>
    imageSelected
      ? editor.getAttributes("image").align === dir
      : editor.isActive({ textAlign: dir });

  const openPrompt = (kind) => {
    const initial =
      kind === "link" ? editor.getAttributes("link").href || "" : "";
    setPrompt({ kind, value: initial });
  };

  const applyPrompt = () => {
    const url = prompt.value.trim();
    const chain = editor.chain().focus();
    if (prompt.kind === "link") {
      if (!url) chain.extendMarkRange("link").unsetLink().run();
      else if (editor.state.selection.empty && !editor.isActive("link")) {
        // No text selected: insert the URL itself as the link text.
        chain
          .insertContent({
            type: "text",
            text: url,
            marks: [{ type: "link", attrs: { href: url } }],
          })
          .run();
      } else chain.extendMarkRange("link").setLink({ href: url }).run();
    } else if (url && prompt.kind === "image") {
      chain.setImage({ src: url }).run();
    } else if (url && prompt.kind === "youtube") {
      chain.setYoutubeVideo({ src: url }).run();
    }
    setPrompt(null);
  };

  const listIndentTarget = editor.isActive("taskItem")
    ? "taskItem"
    : "listItem";
  const words = editor.storage.characterCount.words();
  const chars = editor.storage.characterCount.characters();

  return (
    <div className="rte">
      <div className="rte-toolbar" role="toolbar" aria-label="Formatting">
        <div className="rte-group">
          <Btn
            icon={LuUndo2}
            label="Undo (Ctrl+Z)"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          />
          <Btn
            icon={LuRedo2}
            label="Redo (Ctrl+Shift+Z)"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          />
        </div>
        <Sep />
        <div className="rte-group">
          <select
            className="rte-select rte-select-block"
            value={blockType}
            onChange={(e) => setBlockType(e.target.value)}
            aria-label="Text style"
            title="Text style"
          >
            <option value="p">Normal text</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
          </select>
          <select
            className="rte-select rte-select-font"
            value={currentFamily}
            onChange={(e) =>
              e.target.value
                ? editor.chain().focus().setFontFamily(e.target.value).run()
                : editor.chain().focus().unsetFontFamily().run()
            }
            aria-label="Font"
            title="Font"
          >
            {/* Keep an unknown pasted font selectable as itself. */}
            {currentFamily &&
              !FONT_FAMILIES.some((f) => f.value === currentFamily) && (
                <option value={currentFamily}>{currentFamily}</option>
              )}
            {FONT_FAMILIES.map((f) => (
              <option
                key={f.label}
                value={f.value}
                style={{ fontFamily: f.value }}
              >
                {f.label}
              </option>
            ))}
          </select>
          <select
            className="rte-select rte-select-size"
            value={currentSize}
            onChange={(e) =>
              e.target.value
                ? editor
                    .chain()
                    .focus()
                    .setFontSize(`${e.target.value}px`)
                    .run()
                : editor.chain().focus().unsetFontSize().run()
            }
            aria-label="Font size"
            title="Font size"
          >
            <option value="">Size</option>
            {currentSize && !FONT_SIZES.includes(Number(currentSize)) && (
              <option value={currentSize}>{currentSize}</option>
            )}
            {FONT_SIZES.map((s) => (
              <option key={s} value={String(s)}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <Sep />
        <div className="rte-group">
          <Btn
            icon={LuBold}
            label="Bold (Ctrl+B)"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <Btn
            icon={LuItalic}
            label="Italic (Ctrl+I)"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <Btn
            icon={LuUnderline}
            label="Underline (Ctrl+U)"
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
          <Btn
            icon={LuStrikethrough}
            label="Strikethrough"
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          />
          <Btn
            icon={LuSubscript}
            label="Subscript"
            active={editor.isActive("subscript")}
            onClick={() => editor.chain().focus().toggleSubscript().run()}
          />
          <Btn
            icon={LuSuperscript}
            label="Superscript"
            active={editor.isActive("superscript")}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
          />
          <Btn
            icon={LuCode}
            label="Inline code"
            active={editor.isActive("code")}
            onClick={() => editor.chain().focus().toggleCode().run()}
          />
        </div>
        <Sep />
        <div className="rte-group">
          <ColorPicker
            size="small"
            presets={COLOR_PRESETS}
            value={textStyle.color || "#000000"}
            allowClear
            onClear={() => editor.chain().focus().unsetColor().run()}
            onChangeComplete={(c) =>
              editor.chain().focus().setColor(c.toHexString()).run()
            }
          >
            <button
              type="button"
              className="rte-btn rte-color-btn"
              title="Text color"
              aria-label="Text color"
              onMouseDown={(e) => e.preventDefault()}
            >
              <LuBaseline size={17} />
              <span
                className="rte-color-bar"
                style={{ background: textStyle.color || "#000" }}
              />
            </button>
          </ColorPicker>
          <ColorPicker
            size="small"
            presets={HIGHLIGHT_PRESETS}
            value={editor.getAttributes("highlight").color || "#fde834"}
            allowClear
            onClear={() => editor.chain().focus().unsetHighlight().run()}
            onChangeComplete={(c) =>
              editor
                .chain()
                .focus()
                .setHighlight({ color: c.toHexString() })
                .run()
            }
          >
            <button
              type="button"
              className="rte-btn rte-color-btn"
              title="Highlight color"
              aria-label="Highlight color"
              onMouseDown={(e) => e.preventDefault()}
            >
              <LuHighlighter size={17} />
              <span
                className="rte-color-bar"
                style={{
                  background:
                    editor.getAttributes("highlight").color || "transparent",
                }}
              />
            </button>
          </ColorPicker>
          <Btn
            icon={LuRemoveFormatting}
            label="Clear formatting"
            onClick={() =>
              editor.chain().focus().unsetAllMarks().clearNodes().run()
            }
          />
        </div>
        <Sep />
        <div className="rte-group">
          <Btn
            icon={LuAlignLeft}
            label={imageSelected ? "Image left" : "Align left"}
            active={isAligned("left")}
            onClick={() => align("left")}
          />
          <Btn
            icon={LuAlignCenter}
            label={imageSelected ? "Image center" : "Align center"}
            active={isAligned("center")}
            onClick={() => align("center")}
          />
          <Btn
            icon={LuAlignRight}
            label={imageSelected ? "Image right" : "Align right"}
            active={isAligned("right")}
            onClick={() => align("right")}
          />
          <Btn
            icon={LuAlignJustify}
            label="Justify"
            disabled={imageSelected}
            active={!imageSelected && isAligned("justify")}
            onClick={() => align("justify")}
          />
          <select
            className="rte-select rte-select-lh"
            value={currentLineHeight}
            onChange={(e) =>
              e.target.value
                ? editor.chain().focus().setLineHeight(e.target.value).run()
                : editor.chain().focus().unsetLineHeight().run()
            }
            aria-label="Line spacing"
            title="Line spacing"
          >
            <option value="">Spacing</option>
            {LINE_HEIGHTS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
        <Sep />
        <div className="rte-group">
          <Btn
            icon={LuList}
            label="Bullet list"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <Btn
            icon={LuListOrdered}
            label="Numbered list"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <Btn
            icon={LuListTodo}
            label="Checklist"
            active={editor.isActive("taskList")}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          />
          <Btn
            icon={LuIndentIncrease}
            label="Indent list item"
            disabled={!editor.can().sinkListItem(listIndentTarget)}
            onClick={() =>
              editor.chain().focus().sinkListItem(listIndentTarget).run()
            }
          />
          <Btn
            icon={LuIndentDecrease}
            label="Outdent list item"
            disabled={!editor.can().liftListItem(listIndentTarget)}
            onClick={() =>
              editor.chain().focus().liftListItem(listIndentTarget).run()
            }
          />
        </div>
        <Sep />
        <div className="rte-group">
          <Btn
            icon={LuQuote}
            label="Quote"
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          />
          <Btn
            icon={LuSquareCode}
            label="Code block"
            active={editor.isActive("codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          />
          <Btn
            icon={LuMinus}
            label="Horizontal line"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          />
        </div>
        <Sep />
        <div className="rte-group">
          <Btn
            icon={LuLink}
            label="Link"
            active={editor.isActive("link") || prompt?.kind === "link"}
            onClick={() => openPrompt("link")}
          />
          <Btn
            icon={LuUnlink}
            label="Remove link"
            disabled={!editor.isActive("link")}
            onClick={() =>
              editor.chain().focus().extendMarkRange("link").unsetLink().run()
            }
          />
          <Btn
            icon={LuImage}
            label="Insert image (upload)"
            onClick={() => imageInputRef.current?.click()}
          />
          <button
            type="button"
            className="rte-btn rte-text-btn"
            title="Insert image from URL"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => openPrompt("image")}
          >
            URL
          </button>
          <Btn
            icon={LuPaperclip}
            label="Attach file"
            onClick={() => fileInputRef.current?.click()}
          />
          <Btn
            icon={LuYoutube}
            label="Embed YouTube video"
            onClick={() => openPrompt("youtube")}
          />
          <Btn
            icon={LuTable}
            label="Insert table"
            disabled={inTable}
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
          />
        </div>
      </div>

      {inTable && (
        <div className="rte-subbar">
          <span className="rte-subbar-label">Table</span>
          {TABLE_ACTIONS.map(([label, run]) => (
            <button
              key={label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run(editor.chain().focus()).run()}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            disabled={!editor.can().mergeOrSplit()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().mergeOrSplit().run()}
          >
            Merge / split cells
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          >
            Header row
          </button>
          <button
            type="button"
            className="danger"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().deleteTable().run()}
          >
            <LuTrash2 size={14} /> Delete table
          </button>
        </div>
      )}

      {imageSelected && (
        <div className="rte-subbar">
          <span className="rte-subbar-label">Image</span>
          <span className="rte-subbar-hint">
            Drag the corners to resize · use the align buttons to position
          </span>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              editor
                .chain()
                .focus()
                .updateAttributes("image", { width: null, height: null })
                .run()
            }
          >
            Original size
          </button>
          <button
            type="button"
            className="danger"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().deleteSelection().run()}
          >
            <LuTrash2 size={14} /> Remove image
          </button>
        </div>
      )}

      {prompt && (
        <form
          className="rte-subbar rte-prompt"
          onSubmit={(e) => {
            e.preventDefault();
            applyPrompt();
          }}
        >
          <span className="rte-subbar-label">
            {prompt.kind === "link"
              ? "Link URL"
              : prompt.kind === "image"
                ? "Image URL"
                : "YouTube URL"}
          </span>
          <input
            autoFocus
            type="url"
            value={prompt.value}
            placeholder="https://…"
            onChange={(e) => setPrompt({ ...prompt, value: e.target.value })}
            onKeyDown={(e) => e.key === "Escape" && setPrompt(null)}
          />
          <button type="submit" className="primary">
            {prompt.kind === "link" && !prompt.value.trim()
              ? "Remove"
              : "Apply"}
          </button>
          <button type="button" onClick={() => setPrompt(null)}>
            Cancel
          </button>
        </form>
      )}

      <div className="rte-page">
        <EditorContent editor={editor} />
      </div>

      <div className="rte-footer">
        <span>
          {words} words · {chars} characters
        </span>
        {uploading > 0 && <span className="rte-uploading">Uploading…</span>}
        {uploadError && <span className="rte-upload-error">{uploadError}</span>}
        <span className="rte-footer-hint">
          Tip: paste or drag images and files straight into the page.
        </span>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          uploadAndInsert([...e.target.files], "image");
          e.target.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          uploadAndInsert([...e.target.files], "file");
          e.target.value = "";
        }}
      />
    </div>
  );
};

RichTextEditor.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onUpload: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
};

export default RichTextEditor;
