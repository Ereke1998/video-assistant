import sys, json, asyncio, ssl, os
import certifi; certifi.where=lambda:"/root/.ccr/ca-bundle.crt"
import edge_tts
SC=[
"Бір ойын бір күнде «Кек алушылар: Финал» бүкіл прокатта жинағаннан көп ақша тапты.",
"19 қарашада GTA 6 шықты. Алғашқы күні алдын ала тапсырыстармен бірге ол 3 миллиард 790 миллион доллар жинады.",
"Бұл — ойын-сауық тарихындағы ең ірі шығарылым. Тек ойындар арасында емес, жалпы: кино да, музыка да.",
"Шыққан түні интернетке түскен жүктеме әлемдік рекордты жаңартты. Миллиондаған адам 200 гигабайттан асатын ойынды бір мезетте жүктеді.",
"Ал стримдерді бір мезетте 8 миллионға жуық адам көрді. Бұрынғы рекорд Valorant-та болатын — бір бүтін оннан жеті миллион. GTA оны төрт жарым есе басып озды.",
"Адамдар бір ойын үшін демалыс алып, түні бойы ұйықтамады. Ал сен GTA 6 үшін демалыс алдың ба? Пікірге жаз!",
]
rate=sys.argv[1]; out=sys.argv[2]; os.makedirs(out,exist_ok=True)
async def one(i,t):
    c=edge_tts.Communicate(t,"kk-KZ-AigulNeural",rate=rate,boundary="WordBoundary",proxy=os.environ.get("HTTPS_PROXY"))
    audio=b""; words=[]
    async for ch in c.stream():
        if ch["type"]=="audio": audio+=ch["data"]
        elif ch["type"]=="WordBoundary": words.append({"t":ch["text"],"s":ch["offset"]/1e7,"e":(ch["offset"]+ch["duration"])/1e7})
    open(f"{out}/s{i+1}.mp3","wb").write(audio); json.dump(words,open(f"{out}/s{i+1}.json","w"),ensure_ascii=False)
async def main():
    for i,t in enumerate(SC): await one(i,t)
asyncio.run(main())
