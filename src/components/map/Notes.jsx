import { useEditor, EditorContent, generateHTML } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef, useState } from 'react'
import { Color,FontFamily, TextStyle, FontSize, BackgroundColor } from '@tiptap/extension-text-style'
import 'prosemirror-view/style/prosemirror.css';
 
const Notes = () => {
  const [showColor,setShowColor] = useState(false);
  const [showSettings,setShowSettings] = useState(false);
  const [update, setUpdate] = useState(false);
  const [currentColor, setCurrentColor] = useState('#FFE299');
  const [fontSiz, setFontSiz] = useState('16');
  const [fontFam, setFontFam] = useState('Arial');
  const [notesTitle,setNotesTitle] = useState('Title of notes');
  const colorRef = useRef(null);
  const settingsRef = useRef(null);
  const editorRef = useRef(null);

  const colorGradients = {
  "#A8DAFF": "linear-gradient(to bottom right, #A8DAFF, #2F7FBF)",
  "#ffffff": "linear-gradient(to bottom right, #ffffff, #666666)",
  "#FFE299": "linear-gradient(to bottom right, #FFE299, #997A44)",
  "#FFAFA3": "linear-gradient(to bottom right, #FFAFA3, #994F48)",
  "#B3EFBD": "linear-gradient(to bottom right, #B3EFBD, #3E8B4F)",
  "#D3BDFF": "linear-gradient(to bottom right, #D3BDFF, #6C3FCC)",
};

  const editor = useEditor({
    extensions: [StarterKit,TextStyle, Color, FontSize, FontFamily],
    content: "<p>Hello World!</p>",
    editorProps: {
      attributes: {
        class: "h-[400px] focus:outline-none p-1",
      },
    },
  });

  function genHTML(){
    const htmlText = editor.getHTML();
    console.log(htmlText);
  }
  useEffect(()=>{
    const handleColor = (event)=>{
      if(colorRef.current && !colorRef.current.contains(event.target)){
        setShowColor(false);
      }
      if((settingsRef.current && !settingsRef.current.contains(event.target)) && (editorRef.current && !editorRef.current.contains(event.target))){
        setShowColor(false);
        setShowSettings(false);
      }
    }
    document.addEventListener("mousedown",handleColor);

    return ()=>{
        document.removeEventListener("mousedown",handleColor);
    }
  },[])

  useEffect(()=>{
    const refresh = ()=>{
      const siz = parseInt(editor?.getAttributes('textStyle').fontSize) || 16;
      setFontSiz(siz);
      const fontFamF = editor?.getAttributes('textStyle').fontFamily || "Arial" ;
      setFontFam(fontFamF);
      setUpdate(u=>!u);
    }
    editor.on("transaction",refresh);
    editor.on("selectionUpdate",refresh)
    return (()=>{
      editor.off("transaction",refresh);
      editor.off("selectionUpdate",refresh)
    })
  },[editor])
  return (
    <div>
    <div className={`${showSettings?"":"opacity-0 pointer-events-none"}`} >
      <div ref={colorRef} className={`${showColor?'':'opacity-0 pointer-events-none'} w-[280px] h-[45px] rounded-xl flex justify-around items-center bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] transition-all duration-300 before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/50 before:via-transparent before:to-transparent before:opacity-70 before:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased`}>
        <div className={` rounded-full h-[30px] w-[30px] cursor-pointer`} style={{ backgroundColor: "#A8DAFF" }} onClick={()=>setCurrentColor("#A8DAFF")}></div>
        <div className={` rounded-full h-[30px] w-[30px] cursor-pointer`} style={{ backgroundColor: "#ffffff" }} onClick={()=>setCurrentColor("#ffffff")}></div>
        <div className={` rounded-full h-[30px] w-[30px] cursor-pointer`} style={{ backgroundColor: "#FFE299" }} onClick={()=>setCurrentColor("#FFE299")}></div>
        <div className={` rounded-full h-[30px] w-[30px] cursor-pointer`} style={{ backgroundColor: "#FFAFA3" }} onClick={()=>setCurrentColor("#FFAFA3")}></div>
        <div className={` rounded-full h-[30px] w-[30px] cursor-pointer`} style={{ backgroundColor: "#B3EFBD" }} onClick={()=>setCurrentColor("#B3EFBD")}></div>
        <div className={` rounded-full h-[30px] w-[30px] cursor-pointer`} style={{ backgroundColor: "#D3BDFF" }} onClick={()=>setCurrentColor("#D3BDFF")}></div>
      </div>
      <div ref={settingsRef} className='my-10 w-[650px] h-[50px] rounded-xl  flex divide-x-3 divide-white/60 text-white justify-between [&>*]:px-4 bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] transition-all duration-300 before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/50 before:via-transparent before:to-transparent before:opacity-70 before:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased'>
        <div className='flex items-center cursor-pointer' onClick={()=>setShowColor(!showColor)}>
          <div className={` rounded-full h-[30px] w-[30px] mx-2`} style={{ backgroundColor: currentColor }}></div>
          {!showColor && <svg xmlns="http://www.w3.org/2000/svg" width={15} height={15} viewBox="0 0 16 7"><path fill="#fff" d="M8 6.5a.47.47 0 0 1-.35-.15l-4.5-4.5c-.2-.2-.2-.51 0-.71s.51-.2.71 0l4.15 4.15l4.14-4.14c.2-.2.51-.2.71 0s.2.51 0 .71l-4.5 4.5c-.1.1-.23.15-.35.15Z" strokeWidth={0.5} stroke="#fff"></path></svg>
        }
        {showColor && <svg xmlns="http://www.w3.org/2000/svg" width={15} height={15} viewBox="0 0 24 24"><path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 15l6-6l6 6"></path></svg>
        }
        </div>
        <div className='flex items-center justify-center'>
          <select className='focus:outline-none bg-black' value={fontFam} onChange={(e)=>{
            setFontFam(e.target.value)
            editor.chain().focus().setFontFamily(e.target.value).run()
          }} name="fontFamily" id="">
            <option value="Arial" style={{ fontFamily: 'Arial' }}>Arial</option>
            <option value="monospace" style={{ fontFamily: 'monospace' }}>monospace</option>
            <option value="cursive" style={{ fontFamily: 'cursive' }}>cursive</option>
            <option value="'Exo 2', sans-serif" style={{ fontFamily: '"Exo 2"' }}>Exo 2</option>
            <option value="Comic Sans MS" style={{ fontFamily: '"Comic Sans MS"' }}>Comic Sans MS</option>
          </select>
        </div>
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
            editor.chain().focus().setFontSize(e.target.value+'px').run()}}
        />
          {/* <svg xmlns="http://www.w3.org/2000/svg" width={15} height={8} viewBox="0 0 16 7"><path fill="#fff" d="M8 6.5a.47.47 0 0 1-.35-.15l-4.5-4.5c-.2-.2-.2-.51 0-.71s.51-.2.71 0l4.15 4.15l4.14-4.14c.2-.2.51-.2.71 0s.2.51 0 .71l-4.5 4.5c-.1.1-.23.15-.35.15Z" strokeWidth={0.5} stroke="#fff"></path></svg> */}
        </div>
        <div className={`flex items-center cursor-pointer transition-all duration-150 ${editor.isActive('bold')?'bg-white/30':''}`} onClick={()=>{editor.chain().focus().toggleBold().run()}}>
          <p className='font-bold mx-2'>B</p>
        </div>
        <div className={`flex items-center cursor-pointer ${editor.isActive('bulletList')?'bg-white/30':''}`} onClick={() => {
          editor.chain().focus().toggleBulletList().run();
          editor.commands.focus();
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width={17} height={17} viewBox="0 0 24 24"><path fill="#fff" fillRule="evenodd" d="M10 4h10a1 1 0 0 1 0 2H10a1 1 0 1 1 0-2m0 7h10a1 1 0 0 1 0 2H10a1 1 0 0 1 0-2m0 7h10a1 1 0 0 1 0 2H10a1 1 0 0 1 0-2M5 7a2 2 0 1 1 0-4a2 2 0 0 1 0 4m0 7a2 2 0 1 1 0-4a2 2 0 0 1 0 4m0 7a2 2 0 1 1 0-4a2 2 0 0 1 0 4" strokeWidth={0.3} stroke="#fff"></path></svg>
        </div>
        <div className='flex items-center cursor-pointer'>
          <p className='mx-2'>Edit</p>
          <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24"><path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 10h3V7L6.5 3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1-3 3l-6-6a6 6 0 0 1-8-8z"></path></svg>
        </div>
        <div className='flex items-center cursor-pointer' onClick={genHTML}>
          <p className='mx-2'>Save</p>
          <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24"><path fill="#fff" d="M18 20.289L21.288 17l-.688-.688l-2.1 2.1v-4.887h-1v4.887l-2.1-2.1l-.688.688zM14.5 23.5v-1h7v1zm-8.384-4q-.652 0-1.134-.482T4.5 17.884V4.116q0-.652.482-1.134T6.116 2.5H13L18.5 8v3.14h-1V8.5h-5v-5H6.116q-.231 0-.424.192t-.192.423v13.77q0 .23.192.423t.423.192h6v1zm-.616-1v-15z" strokeWidth={0.5} stroke="#fff"></path></svg>
        </div>
      </div>
    </div>
    <div ref={editorRef} className='ml-[300px] w-[400px]' onClick={()=>setShowSettings(true)} >
      <div className='w-[400px] h-[35px] bg-[#D9D9D9] flex items-center'>
        <input className='w-full p-1 focus:outline-none' type='text' value={notesTitle} onChange={(e)=>setNotesTitle(e.target.value)} />
      </div>
      <div className='h-[365px] w-[400px] ' style={{ background: colorGradients[currentColor] || currentColor }} >
        <EditorContent editor={editor} />
      </div>
    </div>
    </div>
  )
}


export default Notes;