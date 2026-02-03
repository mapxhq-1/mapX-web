import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { Color, FontFamily, TextStyle, FontSize } from '@tiptap/extension-text-style'
import 'prosemirror-view/style/prosemirror.css';
import { createNote, deleteTheNote, updateNote } from '../../api/note';
import { toast } from 'react-toastify'
import { useParams } from 'react-router-dom'
import delete_icon from '../../../assets/icons/delete_icon.png'
import save_icon from '../../../assets/icons/save_icon.png'
import cancel_icon from '../../../assets/icons/cancel_icon.png'
import { useQueryClient } from '@tanstack/react-query'
import { getEraForYear, getAbsoluteYear } from "../../../utils/era";
import Placeholder from "@tiptap/extension-placeholder";

const Notes = ({ onClose = null, isOpen = false }) => {
  const { id: projectId } = useParams();
  const currentNote = useSelector((state) => state.map.currentNote);
  const year = useSelector((state) => state.map.year);
  const ownerEmail = useSelector((state) => state.project.ownerEmail);

  const [newNote, setNewNote] = useState(false);
  const [showColor, setShowColor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [update, setUpdate] = useState(false);
  const [currentColor, setCurrentColor] = useState('#FFE299');
  const [fontSiz, setFontSiz] = useState('16');
  const [fontFam, setFontFam] = useState('Arial');
  const [notesTitle, setNotesTitle] = useState(currentNote?.title);
  const [content, setContent] = useState(currentNote?.content);
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();
  const colorRef = useRef(null);
  const settingsRef = useRef(null);
  const editorRef = useRef(null);

  // --- COMPACT MODE DETECTION ---
  const [isCompact, setIsCompact] = useState(false);
  useEffect(() => {
    const checkSize = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const isShort = window.innerHeight < 600;
      setIsCompact(isLandscape && isShort);
    };
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  // Update default font size when mode changes
  useEffect(() => {
    if (isCompact) setFontSiz('12');
    else setFontSiz('16');
  }, [isCompact]);

  const colorGradients = {
    "#FFE299": "linear-gradient(135deg, #FFE571 0%, #FFCD2B 100%)", 
    "#A8DAFF": "linear-gradient(135deg, #A8DAFF 0%, #D4EDFF 100%)", 
    "#ffffff": "linear-gradient(135deg, #FFFFFF 0%, #D9D9D9 100%)", 
    "#FFAFA3": "linear-gradient(135deg, #FFAFA3 0%, #FFD6CF 100%)", 
    "#B3EFBD": "linear-gradient(135deg, #B3EFBD 0%, #D9F8E0 100%)", 
    "#D3BDFF": "linear-gradient(135deg, #D3BDFF 0%, #E8DEFF 100%)", 
  };

  // --- DYNAMIC STYLES ---
  const editorWidth = isCompact ? "w-[250px]" : "w-[400px]";
  const editorHeightClass = isCompact ? "h-[200px]" : "h-[365px]";
  // Base font size used for BOTH editor content and title
  const editorFontSize = isCompact ? "text-xs" : "text-base"; 
  
  const toolbarScale = isCompact ? "scale-75 origin-bottom-left" : ""; // Changed origin to bottom-left to keep left alignment stable
  const toolbarBottomPos = isCompact ? "bottom-[105%]" : "bottom-[100%]";

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      FontSize,
      FontFamily,
      Placeholder.configure({
        placeholder: "Write your note...",
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-black/40 before:float-left before:pointer-events-none",
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: `${editorHeightClass} focus:outline-none p-1 overflow-y-auto`,
      },
    },
  });

  async function genHTML() {
    const htmlText = editor.getHTML();
    const selectedEra = getEraForYear(year);
    const apiYear = getAbsoluteYear(year);
    if (!newNote) {
      try {
        await updateNote(currentNote.id, apiYear, selectedEra, ownerEmail, htmlText, currentColor);
        toast.success("Note updated successfully!!");
        onClose();
        queryClient.invalidateQueries(["notes"]);
      } catch (err) {
        toast.error(err.response.data.message);
      }
    } else {
      try {
        await createNote(
          projectId,
          apiYear,
          selectedEra,
          currentNote.coordinates.lat,
          currentNote.coordinates.lng,
          ownerEmail,
          htmlText,
          notesTitle,
          currentColor
        );
        toast.success("Note saved successfully!!");
        try { window.mapxNotesRemoveDraftMarkers && window.mapxNotesRemoveDraftMarkers(); } catch (_) {}
        onClose && onClose();
        queryClient.invalidateQueries(["notes"]);
      } catch (err) {
        toast.error(err.response.data.message);
      }
    }
    setTimeout(() => {
      window.mapxNotesLoadByContext();
    }, 500);
  }

  useEffect(() => {
    if (currentNote) {
      setNewNote(currentNote.id == 'new');
    }
    setNotesTitle(currentNote?.title || "");
    setContent(currentNote?.content || "");
    setCurrentColor(currentNote?.backgroundColor || "#FFE299");

    if (editor && currentNote?.content) {
      editor.commands.setContent(currentNote.content);
    }
  }, [currentNote, editor]);

  useEffect(() => {
    const handleColor = (event) => {
      if (colorRef.current && !colorRef.current.contains(event.target)) {
        setShowColor(false);
      }
      if (
        (settingsRef.current && !settingsRef.current.contains(event.target)) &&
        (editorRef.current && !editorRef.current.contains(event.target)) &&
        (colorRef.current && (!colorRef.current.contains(event.target)))
      ) {
        setShowColor(false);
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handleColor);
    return () => document.removeEventListener("mousedown", handleColor);
  }, []);

  useEffect(() => {
    const refresh = () => {
      const defaultSize = isCompact ? 12 : 16;
      const siz = parseInt(editor?.getAttributes('textStyle').fontSize) || defaultSize;
      setFontSiz(siz);
      const fontFamF = editor?.getAttributes('textStyle').fontFamily || "Arial";
      setFontFam(fontFamF);
      setUpdate(u => !u);
    };
    if (editor) {
      editor.on("transaction", refresh);
      editor.on("selectionUpdate", refresh);
    }
    return (() => {
      if (editor) {
        editor.off("transaction", refresh);
        editor.off("selectionUpdate", refresh);
      }
    });
  }, [editor, isCompact]);

  async function deleteNote() {
    try {
      await deleteTheNote(currentNote.id, ownerEmail);
      toast.success("The note is deleted!!");
      setShowConfirm(false);
      setTimeout(() => {
        window.mapxNotesLoadByContext();
      }, 500);
      onClose();
      queryClient.invalidateQueries(["notes"]);
    } catch (e) {
      toast.error(e.response?.statusText || "Error deleting note");
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent bg-opacity-50" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      
      {/* Wrapper */}
      <div className={`relative flex flex-col items-center pointer-events-auto ${editorWidth}`} ref={editorRef} onClick={() => setShowSettings(true)}>

        {/* === SETTINGS BAR === */}
        <div className={`absolute ${toolbarBottomPos} flex flex-col items-center mb-2 transition-all duration-300 z-[60] ${showSettings ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"} ${toolbarScale}`}>
          
          {/* Colors: Added self-start and ml-1 to align to LEFT */}
          <div ref={colorRef} className={`${showColor ? 'flex' : 'hidden'} w-[160px] h-[25px] rounded-md justify-around items-center bg-white/30 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] transition-all duration-300 mb-2 self-start ml-1 pointer-events-auto`}>
            {Object.keys(colorGradients).map((c) => (
              <div key={c} className="rounded-full h-[18px] w-[18px] cursor-pointer"
                style={{ backgroundColor: c }}
                onClick={(e) => { e.stopPropagation(); setCurrentColor(c); }}></div>
            ))}
          </div>

          <div ref={settingsRef} className='text-black w-[600px] h-[35px] rounded-md flex divide-x-2 divide-white/60 justify-between [&>*]:px-3 bg-white/30 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] transition-all duration-300 pointer-events-auto'>

            <div className='flex items-center cursor-pointer' onClick={(e) => { e.stopPropagation(); setShowColor(!showColor); }}>
              <div className='rounded-full h-[20px] w-[20px] mx-1' style={{ backgroundColor: currentColor }}></div>
              {!showColor && <svg xmlns="http://www.w3.org/2000/svg" width={10} height={10} viewBox="0 0 16 7"><path fill="#000" d="M8 6.5a.47.47 0 0 1-.35-.15l-4.5-4.5c-.2-.2-.2-.51 0-.71s.51-.2.71 0l4.15 4.15l4.14-4.14c.2-.2.51-.2.71 0s.2.51 0 .71l-4.5 4.5c-.1.1-.23.15-.35.15Z" strokeWidth={0.5} stroke="#000"></path></svg>}
              {showColor && <svg xmlns="http://www.w3.org/2000/svg" width={10} height={10} viewBox="0 0 24 24"><path fill="none" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 15l6-6l6 6"></path></svg>}
            </div>

            <div className='flex items-center justify-center'>
              <select className='focus:outline-none bg-transparent text-sm' value={fontFam} onChange={(e) => {
                setFontFam(e.target.value)
                editor.chain().focus().setFontFamily(e.target.value).run()
              }}>
                <option value="Arial">Arial</option>
                <option value="monospace">monospace</option>
                <option value="cursive">cursive</option>
                <option value="'Exo 2', sans-serif">Exo 2</option>
                <option value="Comic Sans MS">Comic Sans MS</option>
              </select>
            </div>

            <div className='flex items-center'>
              <input
                name='fontSize'
                type="number"
                className="w-12 px-1 py-0.5 text-center text-sm bg-transparent rounded-sm focus:outline-none"
                min={10}
                max={30}
                value={fontSiz}
                onChange={(e) => {
                  setFontSiz(e.target.value);
                  editor.chain().focus().setFontSize(e.target.value + 'px').run()
                }}
              />
            </div>

            <div className={`flex items-center cursor-pointer transition-all duration-150 ${editor?.isActive('bold') ? 'bg-white/30' : ''}`} onClick={() => { editor.chain().focus().toggleBold().run() }}>
              <p className='font-bold mx-1 text-sm'>B</p>
            </div>

            <div className={`flex items-center cursor-pointer ${editor?.isActive('bulletList') ? 'bg-white/30' : ''}`} onClick={() => { editor.chain().focus().toggleBulletList().run(); editor.commands.focus(); }}>
              <svg xmlns="http://www.w3.org/2000/svg" width={12} height={14} viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>
            </div>

            <div className='flex items-center cursor-pointer' onClick={genHTML}>
              <p className='mx-1 text-sm'>Save</p>
              <img src={save_icon} alt="save" width={12} height={12} />
            </div>

            <div onClick={() => setShowConfirm(true)} className='flex items-center cursor-pointer'>
              <p className='mx-1 text-red-500 text-sm'>Delete</p>
              <img src={delete_icon} alt="" width={10} height={10} style={{ filter: 'invert(31%) sepia(94%) saturate(7495%) hue-rotate(358deg) brightness(95%) contrast(120%)' }} />
            </div>

            {onClose && (
              <div onClick={() => { try { window.mapxNotesRemoveDraftMarkers && window.mapxNotesRemoveDraftMarkers(); } catch (_) {}; onClose(); }} className='flex items-center cursor-pointer'>
                <p className='text-black text-sm'>Close</p>
                <img src={cancel_icon} alt="cancel" width={14} height={14} />
              </div>
            )}
          </div>
        </div>

        {/* === NOTE HEADER === */}
        <div className={`${editorWidth} h-[35px] bg-[#D9D9D9] flex items-center z-50`}>
          <div className="w-full" title={!newNote ? "Title cannot be edited for existing notes" : ""}>
            <input
              // Applied editorFontSize to the title to match content size logic
              className={`w-full p-1 focus:outline-none bg-transparent font-semibold ${editorFontSize} ${!newNote ? ' cursor-not-allowed' : ''}`}
              type='text'
              value={notesTitle}
              placeholder='Enter the title'
              onChange={(e) => newNote && setNotesTitle(e.target.value)} 
              disabled={!newNote}
            />
          </div>
        </div>

        {/* === NOTE BODY === */}
        {/* Applied editorFontSize here as well */}
        <div className={`${editorHeightClass} ${editorWidth} ${editorFontSize}`} style={{ background: colorGradients[currentColor] || currentColor }}>
          <EditorContent editor={editor} />
        </div>

      </div>

      {/* === CONFIRM DELETE MODAL === */}
      {showConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 pointer-events-auto">
          <div className="bg-white rounded-2xl p-6 w-[300px] text-center shadow-2xl">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">Delete this note?</h2>
            <p className="text-gray-500 mb-5 text-sm">This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <button
                className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-sm font-medium transition"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 text-sm font-medium transition"
                onClick={deleteNote}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Notes;