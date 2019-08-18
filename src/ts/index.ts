import * as markdowntodo  from './markdowntodo'
const domain = markdowntodo.domain;

module view {
  const editorElement = document.querySelector('#editor') as HTMLInputElement
  const resultElement = document.querySelector('#result')
  function refresh() {
    const markdownTodo = markdowntodo.createMarkdownTodo(editorElement.value.trim());
    resultElement.innerHTML = '<table><tr><th>タイトル</th><th>見積もり</th><th>区分</th><th>開始</th><th>終了</th></tr><tr>' + markdownTodo.todoOrSchedules
      .filter(v => !v.isDone)
      .map(v => {
        const text = [
          v.title,
          (v.estimateTime ? v.estimateTime.totalHours : '') + 'h',
          v.isTodo ? 'TODO' : '予定',
          v.startTime ? v.startTime.formated : '',
          v.endTime ? v.endTime.formated : ''
        ].filter(v => v !== null).join('</td><td>')
        return `<td>${text}</td>`
      }).join('</tr><tr>') + '</tr></table>' + `<h3>残り合計: ${domain.Time.createFromTotalMinutes(markdownTodo.todoOrSchedules.filter(v => !v.isDone).reduce((memo, v) => memo + v.estimateTime.totalMinutes, 0)).totalHours}h</h3>`
  }

  /**
   * だいたいキー入力が終わったタイミングを知らせる
   */
  class TypeEndEventHandler {
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

  function getTime() {
    return domain.Time.createFromDate(new Date()).formatedValue();
  }

  /**
   * テキストボックスでタブキー入力時の挙動制御
   * keydownイベント発生時に設定する
   * @param {string} text タブキー入力時に挿入するテキスト。省略時はタブを入力する。 
   */
  function typeTab(text): (e:any)=>boolean {
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

  
}