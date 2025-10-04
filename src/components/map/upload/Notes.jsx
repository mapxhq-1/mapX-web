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
import { useQueryClient } from '@tanstack/react-query'

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

  const colorGradients = {
    "#A8DAFF": "linear-gradient(135deg, #A8DAFF 0%, #D4EDFF 100%)",
    "#ffffff": "linear-gradient(135deg, #FFFFFF 0%, #D9D9D9 100%)",
    "#FFE299": "linear-gradient(135deg, #FFE571 0%, #FFCD2B 100%)",
    "#FFAFA3": "linear-gradient(135deg, #FFAFA3 0%, #FFD6CF 100%)",
    "#B3EFBD": "linear-gradient(135deg, #B3EFBD 0%, #D9F8E0 100%)",
    "#D3BDFF": "linear-gradient(135deg, #D3BDFF 0%, #E8DEFF 100%)",
  };

  const editor = useEditor({
    extensions: [StarterKit, TextStyle, Color, FontSize, FontFamily],
    content: content,
    editorProps: {
      attributes: {
        class: "h-[400px] focus:outline-none p-1",
      },
    },
  });

  async function genHTML() {
    const htmlText = editor.getHTML();
    if (!newNote) {
      try {
        await updateNote(currentNote.id, year, "CE", ownerEmail, htmlText);
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
          year,
          "CE",
          currentNote.coordinates.lat,
          currentNote.coordinates.lng,
          ownerEmail,
          htmlText,
          notesTitle,
          currentColor
        );
        toast.success("Note saved successfully!!");
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
    setNotesTitle(currentNote?.title || "Enter title");
    setContent(currentNote?.content || "");
    setCurrentColor(currentNote?.backgroundColor || "#D3BDFF");

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
      const siz = parseInt(editor?.getAttributes('textStyle').fontSize) || 16;
      setFontSiz(siz);
      const fontFamF = editor?.getAttributes('textStyle').fontFamily || "Arial";
      setFontFam(fontFamF);
      setUpdate(u => !u);
    };
    editor.on("transaction", refresh);
    editor.on("selectionUpdate", refresh);
    return (() => {
      editor.off("transaction", refresh);
      editor.off("selectionUpdate", refresh);
    });
  }, [editor]);

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
      console.log(e);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent bg-opacity-50 ">
      <div className="relative">

        {/* === SETTINGS BAR === */}
        <div className={`${showSettings ? "" : "opacity-0 pointer-events-none"}`}>
          <div ref={colorRef} className={`${showColor ? '' : 'opacity-0 pointer-events-none'} w-[280px] h-[45px] rounded-xl flex justify-around items-center bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] transition-all duration-300`}>
            {Object.keys(colorGradients).map((c) => (
              <div key={c} className="rounded-full h-[30px] w-[30px] cursor-pointer"
                style={{ backgroundColor: c }}
                onClick={() => setCurrentColor(c)}></div>
            ))}
          </div>

          <div ref={settingsRef} className='text-black my-10 w-[900px] h-[50px] rounded-xl flex divide-x-3 divide-white/60 justify-between [&>*]:px-4 bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] transition-all duration-300'>

            {/* COLOR PICKER */}
            <div className='flex items-center cursor-pointer' onClick={() => setShowColor(!showColor)}>
              <div className='rounded-full h-[30px] w-[30px] mx-2' style={{ backgroundColor: currentColor }}></div>
              {!showColor && <svg xmlns="http://www.w3.org/2000/svg" width={15} height={15} viewBox="0 0 16 7"><path fill="#000" d="M8 6.5a.47.47 0 0 1-.35-.15l-4.5-4.5c-.2-.2-.2-.51 0-.71s.51-.2.71 0l4.15 4.15l4.14-4.14c.2-.2.51-.2.71 0s.2.51 0 .71l-4.5 4.5c-.1.1-.23.15-.35.15Z" strokeWidth={0.5} stroke="#000"></path></svg>}
              {showColor && <svg xmlns="http://www.w3.org/2000/svg" width={15} height={15} viewBox="0 0 24 24"><path fill="none" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 15l6-6l6 6"></path></svg>}
            </div>

            {/* FONT FAMILY */}
            <div className='flex items-center justify-center'>
              <select className='focus:outline-none bg-transparent' value={fontFam} onChange={(e) => {
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

            {/* FONT SIZE */}
            <div className='flex items-center'>
              <input
                name='fontSize'
                type="number"
                className="w-15 px-2 py-1 text-center text-sm bg-transparent rounded-md focus:outline-none"
                min={10}
                max={30}
                value={fontSiz}
                onChange={(e) => {
                  setFontSiz(e.target.value);
                  editor.chain().focus().setFontSize(e.target.value + 'px').run()
                }}
              />
            </div>

            {/* BOLD */}
            <div className={`flex items-center cursor-pointer transition-all duration-150 ${editor.isActive('bold') ? 'bg-white/30' : ''}`} onClick={() => { editor.chain().focus().toggleBold().run() }}>
              <p className='font-bold mx-2'>B</p>
            </div>

            {/* BULLETS */}
            <div className={`flex items-center cursor-pointer ${editor.isActive('bulletList') ? 'bg-white/30' : ''}`} onClick={() => { editor.chain().focus().toggleBulletList().run(); editor.commands.focus(); }}>
              <svg xmlns="http://www.w3.org/2000/svg" width={17} height={17} viewBox="0 0 24 24"><path fill="#000" fillRule="evenodd" d="M10 4h10a1 1 0 0 1 0 2H10a1 1 0 1 1 0-2m0 7h10a1 1 0 0 1 0 2H10a1 1 0 0 1 0-2m0 7h10a1 1 0 0 1 0 2H10a1 1 0 0 1 0-2M5 7a2 2 0 1 1 0-4a2 2 0 0 1 0 4m0 7a2 2 0 1 1 0-4a2 2 0 0 1 0 4m0 7a2 2 0 1 1 0-4a2 2 0 0 1 0 4" strokeWidth={0.3} stroke="#fff"></path></svg>
            </div>

            {/* SAVE */}
            <div className='flex items-center cursor-pointer' onClick={genHTML}>
              <p className='mx-2'>Save</p>
              <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24"><path fill="#000" d="M18 20.289L21.288 17l-.688-.688l-2.1 2.1v-4.887h-1v4.887l-2.1-2.1l-.688.688zM14.5 23.5v-1h7v1zm-8.384-4q-.652 0-1.134-.482T4.5 17.884V4.116q0-.652.482-1.134T6.116 2.5H13L18.5 8v3.14h-1V8.5h-5v-5H6.116q-.231 0-.424.192t-.192.423v13.77q0 .23.192.423t.423.192h6v1zm-.616-1v-15z" strokeWidth={0.5} stroke="#fff"></path></svg>
            </div>

            {/* DELETE */}
            <div onClick={() => setShowConfirm(true)} className='flex items-center cursor-pointer'>
              <p className='mx-2 text-red-500'>Delete</p>
              <img src={delete_icon} alt="" style={{ filter: 'invert(31%) sepia(94%) saturate(7495%) hue-rotate(358deg) brightness(95%) contrast(120%)' }} />
            </div>

            {/* CLOSE */}
            {onClose && (
              <div onClick={onClose} className='flex items-center cursor-pointer'>
                <p className='text-black'>Close</p>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <path d="M4.24 2.99a1.25 1.25 0 0 0-.87 2.15L10.23 12l-6.87 6.87a1.25 1.25 0 1 0 1.77 1.77L12 13.77l6.87 6.86a1.25 1.25 0 1 0 1.77-1.77L13.77 12l6.86-6.86a1.25 1.25 0 1 0-1.77-1.77L12 10.23 5.13 3.37a1.25 1.25 0 0 0-.89-.38z"></path>
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* === CONFIRM DELETE MODAL === */}
        {showConfirm && (
          <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 shadow-lg w-[320px] text-center">
              <h2 className="text-lg font-semibold mb-2 text-gray-800">Delete this note?</h2>
              <p className="text-gray-500 mb-5 text-sm">This action cannot be undone.</p>
              <div className="flex justify-center gap-4">
                <button
                  className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 transition"
                  onClick={() => setShowConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition"
                  onClick={deleteNote}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* === NOTE CONTENT === */}
        <div ref={editorRef} className='ml-[300px] w-[400px]' onClick={() => setShowSettings(true)}>
          <div className='w-[400px] h-[35px] bg-[#D9D9D9] flex items-center'>
            <div title={!newNote ? "Title cannot be edited for existing notes" : ""}>
  <input
    className={`w-full p-1 focus:outline-none ${!newNote ? ' cursor-not-allowed' : ''}`}
    type='text'
    value={notesTitle}
    onChange={(e) => newNote && setNotesTitle(e.target.value)} 
    disabled={!newNote}
  />
</div>

          </div>
          <div className='h-[365px] w-[400px]' style={{ background: colorGradients[currentColor] || currentColor }}>
            <EditorContent editor={editor} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Notes;
