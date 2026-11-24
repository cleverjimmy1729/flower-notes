from pathlib import Path
import base64,json
root=Path(__file__).resolve().parent
assets={p.stem:'data:image/jpeg;base64,'+base64.b64encode(p.read_bytes()).decode() for p in sorted(root.glob('*.jpg'))}
required=['hero','osmanthus','chrysanthemum','rose','cherry','magnolia','lotus']
missing=[x for x in required if x not in assets]
if missing: raise SystemExit('Missing assets: '+', '.join(missing))
html=(root/'index.template.html').read_text().replace('/*__CSS__*/',(root/'style.css').read_text()).replace('/*__ASSETS__*/','const ASSETS='+json.dumps(assets,separators=(',',':'))+';').replace('/*__RECOGNITION__*/',(root/'recognition.js').read_text().replace('</script','<\\/script')).replace('/*__APP__*/',(root/'app.js').read_text().replace('</script','<\\/script'))
out=root/'花间·植物手记.html'
out.write_text(html)
print(str(out))
print(f'{out.stat().st_size/1024/1024:.2f} MB, embedded images: {len(assets)}')
