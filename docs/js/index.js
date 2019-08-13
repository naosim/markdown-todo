
// marked.setOptions({ langPrefix: '' });
class Time {
  constructor(hours, minutes) {
    this.hours = hours;
    this.minutes = minutes;
    this.totalMinutes = hours * 60 + minutes;
  }

  static createFromTotalMinutes(m) {
    return Time(Math.floor(m / 60), m % 60);
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
      return new Time(parseInt(text.split('h')[0]) * 60, 0);
    }
    return Time.createFromTotalMinutes(parseInt(text));
  }
}

class Task {
  constructor(title, estimateMinute, startTime, endTime) {
    this.title = title;
    this.estimateMinute = estimateMinute;
    this.startTime = startTime;
    this.endTime = endTime;
    this.isTask = true;
    this.isSchedule = false;
  }

  static todo(title, estimateMinute) {
    return new Task(title, estimateMinute, null, null);
  }
  static doing(title, estimateMinute, startTime) {
    return new Task(title, estimateMinute, startTime, null);
  }
  static done(title, estimateMinute, startTime, endTime) {
    return new Task(title, estimateMinute, startTime, endTime);
  }
}

class Schedule {
  constructor(title, startTime, endTime, isDone) {
    this.title = title;
    this.startTime = startTime;
    this.endTime = endTime;
    this.isDone = isDone;
    this.isTask = false;
    this.isSchedule = true;
  }
}

var parse = function(text) {
  var args = text.split('~~').join('').split('|');
  var title = args[0].trim();
  var ary = args[0].split(' ').map(v => v.trim()).filter(v => v.length > 0);
  if(ary[0].indexOf('-')) {

  } else {

  }
  
}

var renderer = new marked.Renderer();
var markdownData = { 
  taskParseNum: 0 // 0:初期 1:タスクパース中 2:パース完了
};
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
  console.log('paragraph', text);

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
    if(text.indexOf('|') != -1) {
      try {
        return renderer.defaultListitem(`task ${text}`, task, checked)
      } catch(e) {
        return renderer.defaultListitem(text, task, checked)
      }
      
    }
  }

  return renderer.defaultListitem(text, task, checked)
}

renderer.defaultLink = renderer.link;
renderer.link = function(href, title, text) {
  console.log(href, title, text);
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
class TypeEndEventHandler {
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
function typeTab(text) {
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
function typeEnter() {
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

document.querySelector('#editor').addEventListener('keydown', typeTab('  ')/* スペース2つ */);
document.querySelector('#editor').addEventListener('keydown', typeEnter());


var typeEndEventHandler = new TypeEndEventHandler(refresh);
document.querySelector('#editor').addEventListener('keyup', () => {
  typeEndEventHandler.onKeyup();
})
refresh();

function refresh() {
  markdownData = { taskParseNum: 0 };
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
  mermaid.init()
}
mermaid.initialize({startOnLoad:false})

