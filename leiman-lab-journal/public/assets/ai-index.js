/* LEIMAN LAB / AI INDEX · editorial catalogue, dated 2026-11-04.
 * Recommendations are editorial hypotheses, not Leiman Lab model benchmarks.
 * Source links are developer documentation or external benchmarks. */
const models = [
  {id:'astra',name:'GPT-6 Astra',maker:'OpenAI',category:'text',kind:'ЯЗЫКОВАЯ МОДЕЛЬ',access:'Доступна',use:'Сложные рассуждения, научная аналитика, программирование и многошаговые задачи.',limits:'Высокая стоимость API и необходимость проверять фактические утверждения.',evidence:'Независимый индекс AA v5 + документация разработчика',url:'https://openai.com/index/gpt-6-astra/'},
  {id:'sol',name:'GPT-6.1 Sol',maker:'OpenAI',category:'text',kind:'ЯЗЫКОВАЯ МОДЕЛЬ',access:'Доступна',use:'Повседневная сложная работа, документы, разработка, анализ и последовательные правки.',limits:'Для наиболее трудных заданий имеет смысл сравнить результат с более мощной моделью.',evidence:'Документация разработчика + AA v5',url:'https://openai.com/index/introducing-gpt-6-sol-and-luna/'},
  {id:'opus',name:'Claude Opus 5.5',maker:'Anthropic',category:'text',kind:'ЯЗЫКОВАЯ МОДЕЛЬ',access:'Доступна',use:'Работа с кодовой базой, агентная разработка, длинные документы и сложные задачи.',limits:'Инструменты разработки зависят от среды; качество письменной речи зависит от языка и задания.',evidence:'AA v5 + документация Anthropic',url:'https://www.anthropic.com/claude-opus-5-5'},
  {id:'sonnet',name:'Claude Sonnet 5.5',maker:'Anthropic',category:'text',kind:'ЯЗЫКОВАЯ МОДЕЛЬ',access:'Доступна',use:'Практическая разработка, редактура, анализ и массовые профессиональные задачи.',limits:'Не следует автоматически считать равной Opus на самых сложных заданиях.',evidence:'Документация Anthropic',url:'https://www.anthropic.com/news'},
  {id:'argon',name:'Gemini 4 Argon',maker:'Google',category:'text',kind:'ЯЗЫКОВАЯ МОДЕЛЬ',access:'Доступна',use:'Мультимодальная аналитика, длинные документы, сложные интеллектуальные задачи.',limits:'Уточняйте режим рассуждения, доступность продукта и пределы контекста.',evidence:'AA v5 + документация Google',url:'https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-carbon/'},
  {id:'carbon',name:'Gemini 4 Carbon',maker:'Google',category:'text',kind:'ЯЗЫКОВАЯ МОДЕЛЬ',access:'Доступ ограничен',use:'Передовая исследовательская модель, лидер AA Intelligence Index v5 на дату проверки.',limits:'На 04.11.2026 не открыта для массового пользовательского применения. Не закладывайте в обычный рабочий процесс.',evidence:'AA v5 + объявление Google от 28.10.2026',url:'https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-carbon/'},
  {id:'perplexity',name:'Perplexity',maker:'Perplexity',category:'research',kind:'ПОИСКОВЫЙ СЕРВИС',access:'Доступен',use:'Быстро найти открытые публикации, новости, исследования и ссылки для первого обзора темы.',limits:'Ссылка не гарантирует подтверждения вывода. Сверяйте первоисточник.',evidence:'Функции продукта; независимых тестов Leiman Lab нет',url:'https://www.perplexity.ai/'},
  {id:'notebooklm',name:'NotebookLM',maker:'Google',category:'research',kind:'РАБОТА С ИСТОЧНИКАМИ',access:'Доступен',use:'Задавать вопросы к собственному корпусу PDF, научных публикаций и заметок с привязкой к фрагментам.',limits:'Качество вывода зависит от загруженных материалов и качества извлечённого текста.',evidence:'Документация продукта',url:'https://notebooklm.google.com/'},
  {id:'sunburst',name:'GPT Image 2.5 Sunburst',maker:'OpenAI',category:'image',kind:'ИЗОБРАЖЕНИЯ',access:'Доступна через API',use:'Точное редактирование готовых кадров, рекламные визуалы и управляемые итерации.',limits:'Продолжительность и стоимость генерации зависят от размера и качества; точные цены проверяйте в API.',evidence:'Документация OpenAI + внешние рейтинги',url:'https://developers.openai.com/api/docs/guides/tools-image-generation'},
  {id:'banana',name:'Nano Banana 2.1',maker:'Google',category:'image',kind:'ИЗОБРАЖЕНИЯ',access:'Доступность зависит от продукта',use:'Генерация изображений с визуальными референсами, фотоподобные сюжеты и правки.',limits:'Надёжность сохранения персонажа и композиции необходимо проверить на своих кадрах.',evidence:'Внешние рейтинги + материалы разработчика',url:'https://artificialanalysis.ai/'},
  {id:'midjourney',name:'Midjourney V8.2',maker:'Midjourney',category:'image',kind:'ИЗОБРАЖЕНИЯ',access:'Доступна',use:'Арт-дирекшн, визуальный язык, moodboards, fashion и художественные серии.',limits:'Эстетическая выразительность не означает точного соблюдения технического задания.',evidence:'Документация Midjourney',url:'https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version'},
  {id:'ideogram',name:'Ideogram 4.5',maker:'Ideogram',category:'image',kind:'ИЗОБРАЖЕНИЯ',access:'Доступна',use:'Локальные правки деталей и вариации готового изображения с сохранением остальных областей.',limits:'Преимущества в узкой задаче не доказывают превосходства в художественном поиске.',evidence:'Спецификация Precise Edit от Ideogram',url:'https://ideogram.ai/models/4.5'},
  {id:'recraft',name:'Recraft V4.1 Vector',maker:'Recraft',category:'image',kind:'ВЕКТОРНАЯ ГРАФИКА',access:'Доступна',use:'Создание масштабируемых SVG, иконок, элементов бренда и редактируемых иллюстраций.',limits:'Готовый SVG ещё требует проверки геометрии, шрифтов и прав на бренд.',evidence:'Документация Recraft',url:'https://www.recraft.ai/ai-vector-generator'},
  {id:'wan',name:'Wan 3.0',maker:'Alibaba',category:'video',kind:'ВИДЕО',access:'Зависит от платформы',use:'Генерация видео по тексту и редактирование видео; высокие позиции в отдельных видеорейтингах.',limits:'Рейтинг text-to-video нельзя напрямую переносить на анимацию конкретных референсов.',evidence:'Artificial Analysis, Video Arena',url:'https://artificialanalysis.ai/video/leaderboard/text-to-video'},
  {id:'seedance',name:'Seedance 2.5',maker:'ByteDance',category:'video',kind:'ВИДЕО',access:'Через поддерживаемые площадки',use:'Анимация утверждённых кадров, работа с несколькими референсами, монтажные переходы и аудиовизуальные сцены.',limits:'API и функции отличаются по платформам; до 30 секунд за генерацию заявлено разработчиком.',evidence:'Документация ByteDance + Video Arena',url:'https://seed.bytedance.com/en/blog/one-take-creation-flexible-referencing-introducing-seedance-2-5'},
  {id:'runway',name:'Runway Aleph 2.0',maker:'Runway',category:'video',kind:'РЕДАКТИРОВАНИЕ ВИДЕО',access:'Доступность по тарифу',use:'Правка существующего видео с сохранением производственного контекста.',limits:'Не лидер всех видеобенчмарков; особенно важны цена секунды и стабильность дубля.',evidence:'Artificial Analysis, Video Editing',url:'https://artificialanalysis.ai/video/leaderboard/video-editing/'},
  {id:'gen45',name:'Runway Gen-4.5',maker:'Runway',category:'video',kind:'ГЕНЕРАЦИЯ ВИДЕО',access:'Доступна',use:'Короткие сцены, заданная кинематография и сложные последовательности движения.',limits:'Стандартная генерация ограничена короткими отрезками; стоимость рассчитывается по секундам.',evidence:'Документация Runway',url:'https://help.runwayml.com/hc/en-us/articles/46974685288467-Creating-with-Gen-4-5'},
  {id:'suno',name:'Suno V6',maker:'Suno',category:'audio',kind:'МУЗЫКА',access:'Платная подписка',use:'Полноценные треки, эскизы композиций, замена фрагментов и музыкальные эксперименты.',limits:'Проверяйте права, тариф и лимиты скачивания; коммерческие права не тождественны авторско-правовой охране.',evidence:'Официальные заметки о выпуске и правила экспорта',url:'https://suno.com/release-notes/introducing-v6'},
  {id:'wild',name:'Suno V6 Wild',maker:'Suno',category:'audio',kind:'ЭКСПЕРИМЕНТАЛЬНАЯ МУЗЫКА',access:'Платная подписка',use:'Поиск неожиданной структуры, текстур, необычных жанровых сочетаний и звуковых решений.',limits:'Экспериментальность может снижать точность исполнения сложного задания.',evidence:'Описание разработчика',url:'https://help.suno.com/en/articles/13924801'},
  {id:'eleven',name:'Eleven v4',maker:'ElevenLabs',category:'audio',kind:'СИНТЕЗ РЕЧИ',access:'Доступна',use:'Эмоциональная озвучка видео, персонажей, рассказов и многоязычных диалогов.',limits:'Используйте голоса и материалы только при наличии необходимых разрешений.',evidence:'Официальная документация ElevenLabs',url:'https://elevenlabs.io/blog/eleven-v4'}
];
const routes = {
 research:{ids:['perplexity','astra','opus'],note:'Поиск → проверка оригинальных публикаций → синтез. Не выдавайте найденные цитирования за проверенные.'},
 sources:{ids:['notebooklm','opus','argon'],note:'Для закрытого набора документов важно сохранить привязку каждого вывода к конкретному фрагменту.'},
 writing:{ids:['sol','opus','sonnet'],note:'Дайте модели собственные тексты и требования к жанру. Проверяйте факты и оставляйте авторскую позицию за человеком.'},
 reasoning:{ids:['astra','opus','argon'],note:'Самые сложные задачи требуют независимой проверки решения и лучше нескольких подходов.'},
 coding:{ids:['opus','sol','sonnet'],note:'Сравнивайте вместе с IDE, доступом к репозиторию и тестами. Модель без среды исполнения не завершает задачу.'},
 data:{ids:['sol','astra','opus'],note:'Для расчётов используйте исполняемый код и проверяемые формулы. Текстовый ответ модели не заменяет вычисление.'},
 'image-art':{ids:['midjourney','sunburst','banana'],note:'Выбирайте по художественному вкусу и повторяемости стиля; визуальные бенчмарки не измеряют все нюансы арт-дирекшна.'},
 'image-edit':{ids:['sunburst','ideogram','banana'],note:'Смотрите, что система сохранила, а не только что успешно изменила. Один удачный пример недостаточен.'},
 vector:{ids:['recraft','ideogram','sunburst'],note:'Если нужен редактируемый SVG, проверьте настоящий векторный экспорт и структуру контуров.'},
 'video-text':{ids:['wan','gen45','seedance'],note:'Для видео из описания ориентиром может служить слепой рейтинг Text-to-Video, но тестируйте собственные 4-секундные сцены.'},
 'video-ref':{ids:['seedance','wan','gen45'],note:'Сначала утвердите стиль-кадры, затем проверяйте целостность персонажа, движения и камеры на серии попыток.'},
 'video-edit':{ids:['wan','seedance','runway'],note:'Для редактирования существующего видео сравнивайте отдельный рейтинг Video Editing и цену пригодной секунды.'},
 music:{ids:['suno','wild'],note:'Перед коммерческой сдачей проверяйте условия подписки, лицензии, права на исходные материалы и фактический экспорт.'},
 voice:{ids:['eleven'],note:'Для диалога и озвучки важны выразительность, сохранение голоса, формат экспорта и разрешение на использование голоса.'}
};
const label={text:'ТЕКСТ / РАССУЖДЕНИЯ',research:'ИССЛЕДОВАНИЯ',image:'ВИЗУАЛ',video:'ВИДЕО',audio:'АУДИО'};
const $=s=>document.querySelector(s);
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const modelById=new Map(models.map(m=>[m.id,m]));
function renderNavigator(){
 const route=routes[$('#ai-task').value]||routes.research;
 $('#ai-recommendation-note').textContent=route.note;
 $('#ai-recommendations').innerHTML=route.ids.map((id,i)=>{const m=modelById.get(id);return `<article class="ai-result"><div class="ai-result-num">${String(i+1).padStart(2,'0')}</div><div><div class="ai-result-head"><h3>${escapeHTML(m.name)}</h3><small>${escapeHTML(m.maker)}</small>${m.access.toLowerCase().includes('огранич')?'<span class="ai-result-status">ОГРАНИЧЕННЫЙ ДОСТУП</span>':''}</div><p>${escapeHTML(m.use)} ${escapeHTML(m.limits)}</p><a href="${escapeHTML(m.url)}" target="_blank" rel="noopener noreferrer">ОПИСАНИЕ И ИСТОЧНИК ↗</a></div></article>`;}).join('');
}
function card(m){return `<article class="ai-model-card"><div><span class="ai-family">${label[m.category]}</span><span class="ai-availability">${escapeHTML(m.access.toUpperCase())}</span></div><h3>${escapeHTML(m.name)}</h3><p>${escapeHTML(m.use)} ${escapeHTML(m.limits)}</p><div class="ai-card-foot"><small>${escapeHTML(m.maker)} · ${escapeHTML(m.kind)}</small><a href="${escapeHTML(m.url)}" target="_blank" rel="noopener noreferrer">ИСТОЧНИК ↗</a></div></article>`;}
function renderCatalogue(){
 const q=($('#ai-search').value||'').trim().toLocaleLowerCase('ru');
 const category=$('#ai-category').value;
 const shown=models.filter(m=>(category==='all'||category===m.category)&&(!q||[m.name,m.maker,m.use,m.limits,m.kind].join(' ').toLocaleLowerCase('ru').includes(q)));
 $('#ai-filter-count').textContent=`ПОКАЗАНО ${shown.length} ИЗ ${models.length}`;
 $('#ai-model-grid').innerHTML=shown.map(card).join('')||'<p style="padding:23px;background:#f2f0e9;margin:0">По этому запросу ничего не найдено.</p>';
}
function compareCard(m){
 return `<article class="ai-compare-card"><small>${escapeHTML(m.maker.toUpperCase())} / ${label[m.category]}</small><h3>${escapeHTML(m.name)}</h3><dl><dt>ГДЕ ПРИМЕНЯТЬ</dt><dd>${escapeHTML(m.use)}</dd><dt>ГРАНИЦЫ</dt><dd>${escapeHTML(m.limits)}</dd><dt>ДОСТУП</dt><dd>${escapeHTML(m.access)}</dd><dt>УРОВЕНЬ ДАННЫХ</dt><dd>${escapeHTML(m.evidence)}</dd></dl><a href="${escapeHTML(m.url)}" target="_blank" rel="noopener noreferrer">ПОДРОБНЕЕ ↗</a></article>`;
}
function renderComparison(){
 const a=modelById.get($('#ai-compare-a').value),b=modelById.get($('#ai-compare-b').value);
 if(!a||!b)return;
 const warning=a.category===b.category?'Сходная категория не гарантирует сравнимость моделей: проверьте тип задания и условия испытаний.':'Разные категории: прямое сравнение «качества» некорректно. Сопоставляйте лишь применимость к своему процессу.';
 $('#ai-compare-output').innerHTML=compareCard(a)+compareCard(b)+`<div class="ai-compare-warning">${escapeHTML(warning)} Здесь нет оценки Leiman Lab: собственные сравнительные прогоны ещё не опубликованы.</div>`;
}
function calc(){
 const cost=Math.max(0,Number($('#ai-cost').value)||0);
 const p=Math.min(1,Math.max(.01,(Number($('#ai-success').value)||1)/100));
 const minutes=Math.max(0,Number($('#ai-minutes').value)||0);
 const hourly=Math.max(0,Number($('#ai-hourly').value)||0);
 const expected=1/p;
 const total=expected*(cost+minutes/60*hourly);
 const ten=100*(1-Math.pow(1-p,10));
 const fmt=(n,d=1)=>n.toLocaleString('ru-RU',{minimumFractionDigits:d,maximumFractionDigits:d});
 $('#ai-expected-attempts').textContent=fmt(expected);
 $('#ai-result-cost').textContent='$'+fmt(total,2);
 $('#ai-ten-success').textContent=fmt(ten)+'%';
}
function init(){
 $('#ai-count').textContent=models.length;
 $('#ai-task').addEventListener('change',renderNavigator);
 $('#ai-search').addEventListener('input',renderCatalogue);
 $('#ai-category').addEventListener('change',renderCatalogue);
 for(const s of ['#ai-compare-a','#ai-compare-b']){
  $(s).innerHTML=models.map(m=>`<option value="${m.id}">${escapeHTML(m.name)}</option>`).join('');
  $(s).addEventListener('change',renderComparison);
 }
 $('#ai-compare-a').value='astra';$('#ai-compare-b').value='opus';
 for(const s of ['#ai-cost','#ai-success','#ai-minutes','#ai-hourly'])$(s).addEventListener('input',calc);
 renderNavigator();renderCatalogue();renderComparison();calc();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
