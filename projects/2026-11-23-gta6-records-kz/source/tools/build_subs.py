import json,re
d=json.load(open('voice/timeline.json'))
CH={1:["БІР ОЙЫН","*бір күнде*","«КЕК АЛУШЫЛАР: ФИНАЛ»","БҮКІЛ ПРОКАТТА ЖИНАҒАННАН","КӨП АҚША ТАПТЫ"],
2:["19 ҚАРАШАДА","GTA 6 ШЫҚТЫ","АЛҒАШҚЫ КҮНІ","АЛДЫН АЛА ТАПСЫРЫСТАРМЕН","БІРГЕ ОЛ","*3 миллиард 790 миллион*","ДОЛЛАР ЖИНАДЫ"],
3:["БҰЛ ОЙЫН-САУЫҚ ТАРИХЫНДАҒЫ","*ең ірі* ШЫҒАРЫЛЫМ","ТЕК ОЙЫНДАР АРАСЫНДА ЕМЕС","ЖАЛПЫ","КИНО ДА МУЗЫКА ДА"],
4:["ШЫҚҚАН ТҮНІ","ИНТЕРНЕТКЕ ТҮСКЕН ЖҮКТЕМЕ","*әлемдік рекордты* ЖАҢАРТТЫ","МИЛЛИОНДАҒАН АДАМ","200 ГИГАБАЙТТАН АСАТЫН","ОЙЫНДЫ БІР МЕЗЕТТЕ ЖҮКТЕДІ"],
5:["АЛ СТРИМДЕРДІ","БІР МЕЗЕТТЕ","8 МИЛЛИОНҒА ЖУЫҚ","АДАМ КӨРДІ","БҰРЫНҒЫ РЕКОРД","VALORANT-ТА БОЛАТЫН","1,7 МИЛЛИОН","GTA ОНЫ","*төрт жарым есе*","БАСЫП ОЗДЫ"],
6:["АДАМДАР БІР ОЙЫН ҮШІН","ДЕМАЛЫС АЛЫП","ТҮНІ БОЙЫ ҰЙЫҚТАМАДЫ","АЛ СЕН GTA 6 ҮШІН","ДЕМАЛЫС АЛДЫҢ БА?","*пікірге жаз!*"]}
chunks=[]
for sc in range(1,7):
    toks=[w for w in d['words'] if w['scene']==sc]; k=0
    for c in CH[sc]:
        words=[]; acc=False
        for raw in c.split():
            a0=raw.startswith('*'); a1=raw.endswith('*'); txt=raw.strip('*')
            if a0: acc=True
            n=4 if txt=='1,7' else 1
            ts=toks[k:k+n]; k+=n
            words.append({"t":txt,"a":acc,"s":ts[0]['s'],"e":ts[-1]['e']})
            if a1: acc=False
        chunks.append({"scene":sc,"words":words})
    assert k==len(toks),(sc,k,len(toks))
for i,c in enumerate(chunks):
    c['s']=c['words'][0]['s']-0.06
    nxt=chunks[i+1]['words'][0]['s']-0.06 if i+1<len(chunks) else d['total']
    c['e']=min(nxt, c['words'][-1]['e']+0.6) if i+1<len(chunks) else c['words'][-1]['e']+1.3
d['chunks']=chunks
open('r3d/data.js','w').write('window.TL='+json.dumps(d,ensure_ascii=False)+';')
def ts(x): ms=int(round(x*1000)); return f"{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}"
out=[]
for i,c in enumerate(chunks):
    out.append(f"{i+1}\n{ts(c['s'])} --> {ts(c['e'])}\n{' '.join(w['t'].upper() for w in c['words'])}\n")
open('voice/subtitles_kz.srt','w').write('\n'.join(out)); print(len(chunks),'chunks'); print(out[5])
