import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

/**
 * No-dependency behavioral smoke test for organism.js.
 * Executes actual browser client code against a minimal simulated DOM.
 * This tests step/scenario/play controls in CI even when remote browser QA is unavailable.
 */
export function organismUiTest() {
  const source = readFileSync('public/assets/organism.js', 'utf8');
  class FakeElement {
    constructor(dataset={}) {
      this.dataset=dataset;
      this.textContent='';
      this.innerHTML='';
      this.value='0';
      this.handlers={};
      this.attributes={};
      this.items=[];
      this.classList={
        names:new Set(),
        toggle:(name,on)=>{if(on)this.classList.names.add(name);else this.classList.names.delete(name)}
      };
    }
    addEventListener(name,callback){this.handlers[name]=callback}
    setAttribute(name,value){this.attributes[name]=String(value)}
    replaceChildren(){this.items=[]}
    appendChild(item){this.items.push(item)}
    click(){assert.equal(typeof this.handlers.click,'function','click handler missing');this.handlers.click()}
    change(){assert.equal(typeof this.handlers.change,'function','change handler missing');this.handlers.change()}
  }
  function run(locale){
    const ids=['org-scenario','org-play','org-next','org-reset','org-step-counter','org-step-title','org-step-status','org-step-description',
      'org-step-action','org-step-gate','org-contract-value','org-delivery','org-review','org-margin','org-trace-count','org-trace','org-map-state','org-live'];
    const elements=Object.fromEntries(ids.map(k=>[k,new FakeElement()]));
    const buttons=Array.from({length:8},(_,i)=>new FakeElement({step:String(i)}));
    const mapStages=Array.from({length:8},(_,i)=>new FakeElement({mapStage:String(i)}));
    const svg=new FakeElement();
    svg.querySelectorAll=query=>query==='[data-map-stage]'?mapStages:[];
    svg.querySelector=()=>null;
    elements['organism-map']=svg;
    const root={
      dataset:{lang:locale},
      querySelector:selector=>elements[selector.slice(1)]||null,
      querySelectorAll:selector=>selector==='.org-stage'?buttons:[]
    };
    const events={};
    let timed=null;
    const sandbox={
      document:{getElementById:id=>id==='income-organism'?root:null,addEventListener:(name,fn)=>{events[name]=fn},createElement:()=>new FakeElement()},
      window:{matchMedia:()=>({matches:true}),addEventListener:(name,fn)=>{events[name]=fn}},
      performance:{now:()=>0},
      setInterval:fn=>{timed=fn;return 1},
      clearInterval:()=>{timed=null},
      requestAnimationFrame:()=>1,
      cancelAnimationFrame:()=>{},
      console
    };
    runInNewContext(source,sandbox,{timeout:1500});
    assert.equal(elements['org-step-counter'].textContent,'01 / 08','default stage');
    assert.ok(svg.innerHTML.includes('FINANCE'),'map should be rendered with its central curator');
    assert.ok(svg.innerHTML.includes('data-map-stage="7"'),'all eight stages should render');
    elements['org-next'].click();
    assert.equal(elements['org-step-counter'].textContent,'02 / 08','next should advance');
    assert.equal(buttons[1].attributes['aria-pressed'],'true','current stage should be accessible');
    buttons[6].click();
    assert.equal(elements['org-step-counter'].textContent,'07 / 08','stage navigation should jump');
    assert.ok(elements['org-step-gate'].textContent.length>20,'stage safeguards should show');
    elements['org-scenario'].value='1';elements['org-scenario'].change();
    assert.equal(elements['org-contract-value'].textContent.replace(/[^0-9]/g,''),'8000','scenario selection should recalculate finance');
    assert.equal(elements['org-step-counter'].textContent,'01 / 08','changing scenario resets workflow');
    elements['org-play'].click();
    assert.equal(elements['org-play'].attributes['aria-pressed'],'true','autoplay button should activate');
    assert.ok(typeof timed==='function','autoplay must create interval');
    timed();
    assert.equal(elements['org-step-counter'].textContent,'02 / 08','autoplay advances a stage');
    elements['org-play'].click();
    assert.equal(elements['org-play'].attributes['aria-pressed'],'false','autoplay must pause');
    assert.equal(timed,null,'pause clears timer');
    mapStages[4].click();
    assert.equal(elements['org-step-counter'].textContent,'05 / 08','SVG stage is interactive');
    elements['org-reset'].click();
    assert.equal(elements['org-contract-value'].textContent.replace(/[^0-9]/g,''),'12000','reset restores original scenario');
    assert.equal(elements['org-step-counter'].textContent,'01 / 08','reset starts from sensing');
    assert.ok(elements['org-trace'].items.length===1,'event history resets with simulation');
    assert.ok(elements['org-step-description'].textContent.length>25,'description should be visible');
    return true;
  }
  run('en');
  run('ru');
  console.log('✓ organism interactive stage navigation, scenarios, SVG node selection, autoplay, pause and reset in EN/RU');
}
