import { useEffect, useMemo, useState } from 'react'
import { Shirt, Plus, Sun, Moon, LayoutGrid, Heart, Sparkles, Trash2, ImagePlus, ExternalLink, Check, X, Bookmark, Menu } from 'lucide-react'

type Garment = { id: string; type: 'Top' | 'Bottom' | 'Shoes'; name: string; image: string }
type Outfit = { id: string; name: string; top?: Garment; bottom?: Garment; shoes?: Garment; created: number }
const starter: Garment[] = []
const read = <T,>(key: string, fallback: T): T => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback } catch { return fallback }
}

export default function App() {
  const [dark, setDark] = useState(() => read('yw-dark', false))
  const [tab, setTab] = useState<'studio' | 'wardrobe' | 'saved'>('studio')
  const [items, setItems] = useState<Garment[]>(() => read('yw-items', starter))
  const [outfits, setOutfits] = useState<Outfit[]>(() => read('yw-outfits', []))
  const [selected, setSelected] = useState<{Top?: string; Bottom?: string; Shoes?: string}>({})
  const [outfitName, setOutfitName] = useState('Everyday look')
  const [filter, setFilter] = useState<'All' | Garment['type']>('All')
  const [previewMode, setPreviewMode] = useState<'flat' | 'model'>('flat')
  const [showAdd, setShowAdd] = useState(false)
  const [newType, setNewType] = useState<Garment['type']>('Top')
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { localStorage.setItem('yw-dark', JSON.stringify(dark)) }, [dark])
  useEffect(() => { localStorage.setItem('yw-items', JSON.stringify(items)) }, [items])
  useEffect(() => { localStorage.setItem('yw-outfits', JSON.stringify(outfits)) }, [outfits])

  const current = useMemo(() => ({
    top: items.find(x => x.id === selected.Top),
    bottom: items.find(x => x.id === selected.Bottom),
    shoes: items.find(x => x.id === selected.Shoes)
  }), [items, selected])

  const addGarment = (image: string) => {
    if (!image) { setError('Choose a photo or paste an image URL.'); return }
    const item: Garment = { id: crypto.randomUUID(), type: newType, name: newName.trim() || `${newType} ${items.filter(x => x.type === newType).length + 1}`, image }
    setItems(prev => [item, ...prev]); setSelected(prev => ({ ...prev, [newType]: item.id }))
    setNewName(''); setNewUrl(''); setError(''); setShowAdd(false)
  }

  const saveOutfit = () => {
    if (!current.top && !current.bottom && !current.shoes) { setError('Add at least one item to your outfit first.'); return }
    const outfit: Outfit = { id: crypto.randomUUID(), name: outfitName.trim() || 'My outfit', ...current, created: Date.now() }
    setOutfits(prev => [outfit, ...prev]); setError('Outfit saved to your collection.')
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(x => x.id !== id))
    setSelected(prev => Object.fromEntries(Object.entries(prev).filter(([, value]) => value !== id)))
  }

  const pickFile = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return }
    const reader = new FileReader()
    reader.onload = () => addGarment(String(reader.result))
    reader.readAsDataURL(file)
  }

  return <div className={dark ? 'app dark' : 'app'}>
    <header className="topbar">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); setTab('studio') }}><span className="brand-mark">Y</span><span>YourWardrobe<small>PERSONAL STYLE, SIMPLIFIED</small></span></a>
      <nav className="desktop-nav">
        <button className={tab === 'studio' ? 'nav active' : 'nav'} onClick={() => setTab('studio')}>Outfit studio</button>
        <button className={tab === 'wardrobe' ? 'nav active' : 'nav'} onClick={() => setTab('wardrobe')}>My wardrobe <span>{items.length}</span></button>
        <button className={tab === 'saved' ? 'nav active' : 'nav'} onClick={() => setTab('saved')}>Saved outfits <span>{outfits.length}</span></button>
      </nav>
      <button className="icon-btn theme-btn" aria-label="Toggle theme" onClick={() => setDark(!dark)}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button>
    </header>

    <main>
      <section className="intro">
        <div><div className="eyebrow"><Sparkles size={14}/> YOUR PERSONAL STYLE SPACE</div><h1>{tab === 'studio' ? <>Get dressed.<br/><em>With intention.</em></> : tab === 'wardrobe' ? <>Your pieces.<br/><em>Your possibilities.</em></> : <>Looks worth<br/><em>keeping.</em></>}</h1><p>{tab === 'studio' ? 'Mix the pieces you own and find a look that feels like you.' : tab === 'wardrobe' ? 'A considered collection of the pieces in your closet.' : 'Your favourite combinations, all in one place.'}</p></div>
        <div className="intro-note"><span className="note-line"/><span>LESS GUESSING, MORE GETTING READY.</span></div>
      </section>

      <div className="mobile-tabs">
        <button className={tab === 'studio' ? 'active' : ''} onClick={() => setTab('studio')}>Studio</button><button className={tab === 'wardrobe' ? 'active' : ''} onClick={() => setTab('wardrobe')}>Wardrobe</button><button className={tab === 'saved' ? 'active' : ''} onClick={() => setTab('saved')}>Saved</button>
      </div>

      {tab === 'studio' && <section className="studio-grid">
        <div className="builder-panel">
          <div className="section-head"><div><span className="eyebrow">01 / BUILD YOUR LOOK</span><h2>The outfit editor</h2></div><span className="subtle">SELECT PIECES</span></div>
          {(['Top', 'Bottom', 'Shoes'] as const).map((type, index) => {
            const picked = items.find(x => x.id === selected[type])
            return <div className="slot" key={type}><div className="slot-number">0{index + 1}</div><div className="slot-content"><div className="slot-title"><strong>{type}</strong><span>{picked ? picked.name : 'Nothing selected yet'}</span></div><div className="slot-options">{items.filter(x => x.type === type).slice(0, 5).map(item => <button key={item.id} className={selected[type] === item.id ? 'mini-item chosen' : 'mini-item'} onClick={() => setSelected(p => ({ ...p, [type]: item.id }))} title={item.name}><img src={item.image} alt={item.name}/>{selected[type] === item.id && <span className="selected-check"><Check size={12}/></span>}</button>)}<button className="add-mini" onClick={() => { setNewType(type); setShowAdd(true) }}><Plus size={17}/></button></div></div></div>
          })}
          <div className="builder-bottom"><label className="field-label">NAME THIS LOOK<input value={outfitName} onChange={e => setOutfitName(e.target.value)} placeholder="e.g. Weekend casual"/></label><button className="primary-btn" onClick={saveOutfit}><Bookmark size={16}/> Save outfit</button></div>
          {error && <p className="feedback">{error}</p>}
        </div>
        <div className="preview-panel">
          <div className="preview-head"><div><span className="eyebrow">02 / YOUR COMBINATION</span><h2>Outfit preview</h2></div><div className="preview-switch"><button className={previewMode === 'flat' ? 'chosen' : ''} onClick={() => setPreviewMode('flat')}>Flat lay</button><button className={previewMode === 'model' ? 'chosen' : ''} onClick={() => setPreviewMode('model')}>Model</button></div></div>
          <div className="preview-stage">
            <div className="stage-label">{previewMode === 'flat' ? 'FLAT LAY PREVIEW' : 'STYLISED MODEL PREVIEW'}</div>
            {previewMode === 'flat' ? <div className="flatlay">
              {current.top ? <img className="flat-top" src={current.top.image} alt="Selected top"/> : <div className="empty-piece top-shape"><Shirt size={28}/><span>TOP</span></div>}
              {current.bottom ? <img className="flat-bottom" src={current.bottom.image} alt="Selected bottom"/> : <div className="empty-piece bottom-shape"><span>BOTTOM</span></div>}
              {current.shoes ? <img className="flat-shoes" src={current.shoes.image} alt="Selected shoes"/> : <div className="empty-piece shoe-shape"><span>SHOES</span></div>}
            </div> : <div className="model-preview">
              <div className="model-head"/>
              <div className="model-neck"/>
              <div className="model-body">
                <div className="model-arms"/>
                {current.top ? <img className="model-top" src={current.top.image} alt="Selected top"/> : <div className="model-top-placeholder">TOP</div>}
              </div>
              <div className="model-legs">
                {current.bottom ? <img src={current.bottom.image} alt="Selected bottom"/> : <span>BOTTOM</span>}
              </div>
              <div className="model-feet">{current.shoes ? <img src={current.shoes.image} alt="Selected shoes"/> : <span>SHOES</span>}</div>
            </div>}
            <div className="preview-caption"><span>{outfitName || 'Untitled look'}</span><span>{[current.top, current.bottom, current.shoes].filter(Boolean).length} / 3 PIECES</span></div>
          </div>
          <div className="preview-tip"><Sparkles size={15}/><span>Your preview updates as you select pieces from your wardrobe.</span></div>
        </div>
      </section>}

      {tab === 'wardrobe' && <section className="collection">
        <div className="section-head"><div><span className="eyebrow">YOUR COLLECTION</span><h2>Everything you own.</h2></div><button className="primary-btn" onClick={() => setShowAdd(true)}><Plus size={16}/> Add a piece</button></div>
        <div className="filters">{(['All', 'Top', 'Bottom', 'Shoes'] as const).map(f => <button key={f} className={filter === f ? 'filter active' : 'filter'} onClick={() => setFilter(f)}>{f}</button>)}</div>
        {items.filter(x => filter === 'All' || x.type === filter).length ? <div className="item-grid">{items.filter(x => filter === 'All' || x.type === filter).map(item => <article className="garment-card" key={item.id}><div className="garment-image"><img src={item.image} alt={item.name}/><button className="delete-btn" aria-label="Delete item" onClick={() => removeItem(item.id)}><Trash2 size={15}/></button></div><div className="garment-meta"><div><strong>{item.name}</strong><span>{item.type}</span></div><button className="select-btn" onClick={() => { setSelected(p => ({ ...p, [item.type]: item.id })); setTab('studio') }}>Use in outfit</button></div></article>)}</div> : <EmptyState title="Your wardrobe starts here." body="Add photos of your tops, bottoms and shoes to start creating outfits." action={() => setShowAdd(true)}/>}
      </section>}

      {tab === 'saved' && <section className="collection"><div className="section-head"><div><span className="eyebrow">YOUR PERSONAL LOOKBOOK</span><h2>Saved outfits.</h2></div><span className="subtle">{outfits.length} LOOKS</span></div>
        {outfits.length ? <div className="saved-grid">{outfits.map(outfit => <article className="saved-card" key={outfit.id}><div className="saved-images">{outfit.top && <img src={outfit.top.image} alt="Top"/>}{outfit.bottom && <img src={outfit.bottom.image} alt="Bottom"/>}{outfit.shoes && <img src={outfit.shoes.image} alt="Shoes"/>}</div><div className="saved-meta"><div><strong>{outfit.name}</strong><span>{new Date(outfit.created).toLocaleDateString()}</span></div><button className="text-btn" onClick={() => { setSelected({ Top: outfit.top?.id, Bottom: outfit.bottom?.id, Shoes: outfit.shoes?.id }); setOutfitName(outfit.name); setTab('studio') }}>Open look</button></div></article>)}</div> : <EmptyState title="No saved looks yet." body="Create a combination in Outfit Studio and save it here." action={() => setTab('studio')}/>}
      </section>}
      <footer><span>YOURWARDROBE © 2026</span><span>STYLE, AT YOUR OWN PACE.</span></footer>
    </main>

    {showAdd && <div className="modal-backdrop" onClick={() => setShowAdd(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">ADD TO YOUR COLLECTION</span><h2>A new piece.</h2></div><button className="icon-btn" onClick={() => setShowAdd(false)}><X size={18}/></button></div><label className="field-label">ITEM TYPE<select value={newType} onChange={e => setNewType(e.target.value as Garment['type'])}><option>Top</option><option>Bottom</option><option>Shoes</option></select></label><label className="field-label">ITEM NAME<input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. White linen shirt"/></label><label className="field-label">IMAGE URL<input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://example.com/image.jpg"/></label><button className="secondary-btn" onClick={() => addGarment(newUrl.trim())}><ExternalLink size={15}/> Add from image URL</button><div className="upload-divider"><span>OR</span></div><label className="upload-box"><ImagePlus size={22}/><strong>Choose a photo</strong><span>JPG, PNG or WEBP</span><input type="file" accept="image/*" onChange={e => pickFile(e.target.files?.[0])}/></label>{error && <p className="feedback">{error}</p>}<p className="modal-footnote">Your photos are saved in this browser on this device. Cloud sync is not enabled yet.</p></div></div>}
  </div>
}

function EmptyState({ title, body, action }: { title: string; body: string; action: () => void }) {
  return <div className="empty-state"><div className="empty-icon"><Shirt size={25}/></div><h3>{title}</h3><p>{body}</p><button className="secondary-btn" onClick={action}><Plus size={15}/> Get started</button></div>
}