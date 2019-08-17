declare function require(x: string): any;
const marked = require('marked')
// declare var mermaid: any;
declare var hljs: any;

var markdownData: {taskParseNum:number, todoOrSchedules: markdowntodo.TodoOrSchedule[]} = { 
  taskParseNum: 0, // 0:初期 1:タスクパース中 2:パース完了
  todoOrSchedules: [],
};

module markdowntodo {


  // marked.setOptions({ langPrefix: '' });
  export class Time {
    private hours: number;
    private minutes: number;
    private totalMinutes: number;

    constructor(hours, minutes) {
      this.hours = hours;
      this.minutes = minutes;
      this.totalMinutes = hours * 60 + minutes;
    }
    minus(otherTime) {
      if(this.totalMinutes < otherTime.totalMinutes) {
        return Time.createFromTotalMinutes((this.totalMinutes + 24 * 60) - otherTime.totalMinutes)
      }
      return Time.createFromTotalMinutes(this.totalMinutes - otherTime.totalMinutes)
    }

    formatedValue(): string {
      return `${Time.zerofil2(this.hours)}:${Time.zerofil2(this.minutes)}`
    }

    static createFromTotalMinutes(m) {
      return new Time(Math.floor(m / 60), m % 60);
    }

    static createFromDate(date: Date): Time {
      return new Time(date.getHours(), date.getMinutes());
    }

    static zerofil2(num): string {
      return `0${num}`.slice(-2);
    }

    static parse(text) {
      if(text.indexOf(':') != -1) {
        let p = text.split(':').map(v => parseInt(v));
        return new Time(p[0], p[1]);
      }
      if(text.indexOf('t') != -1) {
        return Time.createFromTotalMinutes(parseInt(text.split('t')[0]) * 30);
      }
      if(text.indexOf('h') != -1) {
        return new Time(parseInt(text.split('h')[0]), 0);
      }
      return Time.createFromTotalMinutes(parseInt(text));
    }
  }

  class TodoTask implements Task {
    title: string;
    startTime: Time;
    endTime: Time;
    isTodo: boolean;
    isSchedule: boolean;
    isDone: boolean;
    estimateTime: Time;
    state: string
    constructor(title: string, estimateTime: Time, startTime: Time, endTime: Time) {
      this.title = title;
      this.startTime = startTime;
      this.endTime = endTime;
      this.isTodo = true;
      this.isSchedule = false;
      this.isDone = endTime != null;

      if(this.startTime) {
        if(this.isDone) {
          this.state = 'done'
        } else {
          this.state = 'doing'
        }
      } else {
        this.state = 'todo'
      }

      this.estimateTime = estimateTime;
    }

    static todo(title, estimateTime) {
      return new TodoTask(title, estimateTime, null, null);
    }
    static doing(title, estimateTime, startTime) {
      return new TodoTask(title, estimateTime, startTime, null);
    }
    static done(title, estimateTime, startTime, endTime) {
      return new TodoTask(title, estimateTime, startTime, endTime);
    }
  }

  class ScheduleTask implements Task {
    title: string;
    startTime: Time;
    endTime: Time;
    isTodo: boolean;
    isSchedule: boolean;
    isDone: boolean;
    estimateTime: Time;
    constructor(title, startTime, endTime, isDone) {
      this.title = title;
      this.startTime = startTime;
      this.endTime = endTime;
      this.isDone = isDone;
      this.isTodo = false;
      this.isSchedule = true;

      this.estimateTime = endTime.minus(startTime);
    }
  }

  interface Task {
    title: string;
    startTime: Time;
    endTime: Time;
    isTodo: boolean;
    isSchedule: boolean;
    isDone: boolean;
    estimateTime: Time;
  }

  export class TodoOrSchedule implements Task {
    title: string;
    startTime: Time;
    endTime: Time;
    isTodo: boolean;
    isSchedule: boolean;
    isDone: boolean;
    estimateTime: Time;

    todo: TodoTask;
    schedule: ScheduleTask;
    actualTime: Time;
    constructor(task: Task) {
      this.title = task.title;
      this.estimateTime = task.estimateTime;
      this.startTime = task.startTime;
      this.endTime = task.endTime;
      this.isDone = task.isDone;
      if(task.isTodo) {
        this.isTodo = true;
        this.isSchedule = false;
        this.todo = task;
      }
      if(task.isSchedule) {
        this.isTodo = false;
        this.isSchedule = true;
        this.schedule = task;
      }

      this.actualTime = this.isDone ? this.endTime.minus(this.startTime) : new Time(0, 0);
    }
    
  }

  function parse(text: string): TodoOrSchedule {
    var args = text.split('//')[0].split('<del>').join('').split('</del>').join('').split('|');
    var title = args[0].trim();
    var ary = args[1].split(' ').map(v => v.trim()).filter(v => v.length > 0);
    // console.log(ary);
    if(ary[0].indexOf('-') != -1) {// スケジュール
      let times = ary[0].split('-').map(v => v.indexOf(':') != -1 ? v : `${v}:00`).map(v => Time.parse(v))
      let isDone = ary.length >= 2 && ary[1] == 'done'
      return new TodoOrSchedule(new ScheduleTask(title, times[0], times[1], isDone));
    } else {// タスク
      let estimateTime;
      let startTime;
      let endTime;
      if(ary.length >= 1) {
        estimateTime = Time.parse(ary[0]);
      }
      if(ary.length >= 2) {
        startTime = Time.parse(ary[1]);
      }
      if(ary.length >= 3) {
        endTime = Time.parse(ary[2]);
      }

      if(ary.length == 1) {// todo
        return new TodoOrSchedule(TodoTask.todo(title, estimateTime));
      }
      if(ary.length == 2) {// doing
        return new TodoOrSchedule(TodoTask.doing(title, estimateTime, startTime));
      }
      if(ary.length == 3) {// done
        return new TodoOrSchedule(TodoTask.done(title, estimateTime, startTime, endTime));
      }
    }
    
  }

  var renderer = new marked.Renderer();
  renderer.code = function (code, lang) {
    if(lang == 'html-exec') {
      return code;
    }
    if(lang == 'mermaid') {
      return `<div class="mermaid">${code}</div>`;
    }
    return '<pre><code>'+hljs.highlightAuto(code).value+'</code></pre>';
  };

  renderer.defaultParagraph = renderer.paragraph;
  renderer.paragraph = function(text) {
    // console.log('paragraph', text);

    return renderer.defaultParagraph(text);
  }

  renderer.defaultHeading = renderer.heading;
  renderer.heading = function(text, level, raw, slugger) {
    if(markdownData.taskParseNum == 1) {
      markdownData.taskParseNum = 2;
    }

    return renderer.defaultHeading(text, level, raw, slugger);
  }

  renderer.defaultList = renderer.list;
  renderer.list = function(body, ordered, start) {
    return renderer.defaultList(body, ordered, start);
  }

  renderer.defaultListitem = renderer.listitem;
  renderer.listitem = function(text, task, checked) {
    if(markdownData.taskParseNum == 0) {
      markdownData.taskParseNum = 1;
    }
    if(markdownData.taskParseNum < 2) {
      if(text.split('//')[0].indexOf('|') != -1) {
        try {
          var taskOrSchedule: TodoOrSchedule = parse(text);
          markdownData.todoOrSchedules.push(taskOrSchedule);
          return renderer.defaultListitem(text, task, checked)
        } catch(e) {
          console.error(e);
          return renderer.defaultListitem(text, task, checked)
        }
        
      }
    }

    return renderer.defaultListitem(text, task, checked)
  }

  renderer.defaultLink = renderer.link;
  renderer.link = function(href, title, text) {
    // console.log(href, title, text);
    if(href == '$d') {// 日付
      const d = text.split('/').join('-')
      return `<time datetime="${d}">${text}</time>`;
    }
    if(href == '$eval') {
      return eval(text);
    }
    if(text.indexOf('^$') == 0) {// 変数
      return href;
    }
    if(text.indexOf('^') == 0) {// 脚注
      if(!markdownData.link) {
        markdownData.link = {};
      }
      markdownData.link[text] = href;
      return `<sup><a href="#${text}" title="${href}">${text.slice(1)}</a></sup>`
    }
    return renderer.defaultLink(href, title, text);
  }

  // renderer.image = function(href, title, text) {
  //   console.log(href, title, text);
  //   return `<img src="${href}" />`
  // }

  marked.setOptions({
    renderer: renderer
  });

  /**
   * だいたいキー入力が終わったタイミングを知らせる
   */
  export class TypeEndEventHandler {
    callback: any;
    keyupEventList: any[]
    constructor(callback) {
      this.callback = callback;
      this.keyupEventList = [];
    }
    onKeyup() {
      this.keyupEventList.push(true);
      setTimeout(() => {// 入力が終わって一息ついたら反映する
        if(this.keyupEventList.length > 0) {
          this.keyupEventList.pop();
        }
        if(this.keyupEventList.length == 0) {
          this.callback();
        }
      }, 1000) // 入力終了までの待ち時間
    }
  }

  /**
   * テキストボックスでタブキー入力時の挙動制御
   * keydownイベント発生時に設定する
   * @param {string} text タブキー入力時に挿入するテキスト。省略時はタブを入力する。 
   */
  export function typeTab(text): (e:any)=>boolean {
    text = text || '\t';
    const textLength = text.length;
    return function(e) {
      var elem, end, start, value;
      if (e.keyCode === 9) {
        if (e.preventDefault) {
          e.preventDefault();
        }
        elem = e.target;
        start = elem.selectionStart;
        end = elem.selectionEnd;
        value = elem.value;
        elem.value = "" + (value.substring(0, start)) + text + (value.substring(end));
        elem.selectionStart = elem.selectionEnd = start + textLength;
        return false;
      }
    }
  }

  function whiteSpacePrefix(text) {
    var result = '';
    var i = 0;
    while(i < text.length) {
      if(text[i] == ' ') {
        result += ' '
      } else if(text[i] == '　') {// 全角スペース
        result += '　'
      } else {
        return result;
      }
      i++;
    }
    return result;
  }

  /**
   * テキストボックスエンターキー入力時の挙動制御
   * keydownイベント発生時に設定する
   * 行頭のインデントを揃える
   */
  export function typeEnter() {
    return function(e) {
      var elem, end, start, value;
      if (e.keyCode === 13) {
        if (e.preventDefault) {
          e.preventDefault();
        }
        elem = e.target;
        start = elem.selectionStart;
        end = elem.selectionEnd;
        value = elem.value;
        const beforeText = (value.substring(0, start));
        const lastLine = beforeText.slice(beforeText.lastIndexOf('\n') + 1);
        const whiteSpace = whiteSpacePrefix(lastLine);

        var insertText = '\n' + whiteSpace;

        elem.value = "" + beforeText + insertText + (value.substring(end));
        elem.selectionStart = elem.selectionEnd = start + insertText.length;
        return false;
      }
    }
  }

  

  export function refresh() {
    markdownData = {
      taskParseNum: 0,
      todoOrSchedules: [],
    };
    var markdownText = document.querySelector('#editor').value.trim();
    if(markdownText.length == 0) {
      markdownText = document.querySelector('#editor').placeholder;
    }
    var html = marked(markdownText);
    html += '<br>';
    if(markdownData.link) {
      html += Object.keys(markdownData.link).map(key => `<a name="${key}">${key.slice(1)}</a>. ${markdownData.link[key]}`).join('<br>')
    } 
    document.querySelector('#result').innerHTML = html;

    console.log(markdownData);

    const summary = {
      estimate: Time.createFromTotalMinutes(markdownData.todoOrSchedules.reduce((memo, v) => memo + v.estimateTime.totalMinutes, 0)),
      actualTime: Time.createFromTotalMinutes(markdownData.todoOrSchedules.reduce((memo, v) => memo + v.actualTime.totalMinutes, 0))
    }
    

    document.querySelector('#todo').innerHTML = '<table><tr><th>タイトル</th><th>見積もり</th><th>区分</th><th>開始</th><th>終了</th></tr><tr>' + markdownData.todoOrSchedules
      .filter(v => !v.isDone)
      .map(v => {
        const text = [
          v.title,
          v.estimateTime ? v.estimateTime.formatedValue() : '',
          v.isTodo ? 'TODO' : '予定',
          v.startTime ? v.startTime.formatedValue() : '',
          v.endTime ? v.endTime.formatedValue() : ''
        ].filter(v => v !== null).join('</td><td>')
        return `<td>${text}</td>`
      }).join('</tr><tr>') + '</tr></table>' + `<h3>残り合計: ${Time.createFromTotalMinutes(markdownData.todoOrSchedules.filter(v => !v.isDone).reduce((memo, v) => memo + v.estimateTime.totalMinutes, 0)).formatedValue()}</h3>`
    


    // document.querySelector('#schedule').innerHTML = markdownData.todoOrSchedules
    //   .filter(v => !v.isTodo && !v.isDone)
    //   .map(v => `<li>${v.title}</li>`).join('\n')
    // console.log()
    // mermaid.init()
  }
}

document.querySelector('#editor').addEventListener('keydown', markdowntodo.typeTab('  ')/* スペース2つ */);
document.querySelector('#editor').addEventListener('keydown', markdowntodo.typeEnter());


var typeEndEventHandler = new markdowntodo.TypeEndEventHandler(markdowntodo.refresh);
document.querySelector('#editor').addEventListener('keyup', () => {
  typeEndEventHandler.onKeyup();
})
// mermaid.initialize({startOnLoad:false})
markdowntodo.refresh();


function getTime() {
  return markdowntodo.Time.createFromDate(new Date()).formatedValue();
}

// 時刻表示
const timeSpan = document.querySelector('#time');
var lastTime = '';
setInterval(() => {
  const time = getTime();
  if(time != lastTime) {
    lastTime = time;
    timeSpan.innerHTML = lastTime;
  }
}, 1000)