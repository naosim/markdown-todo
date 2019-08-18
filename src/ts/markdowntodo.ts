export module markdowntodo {
  declare function require(x: string): any;
  const marked = require('marked')

  var markdownData: {taskParseNum:number, todoOrSchedules: markdowntodo.TodoOrSchedule[]} = { 
    taskParseNum: 0, // 0:初期 1:タスクパース中 2:パース完了
    todoOrSchedules: [],
  };

  /**
   * 時刻 (時間, 分)
   */
  export class Time {
    get hours(): number {return this._hours; }
    get minutes(): number { return this._minutes; }
    get totalMinutes(): number { return this._totalMinutes; }
    get totalHours(): number { return this.hours + this.minutes / 60; }
    get formated(): string { return `${Time.zerofil2(this.hours)}:${Time.zerofil2(this.minutes)}` }

    private _hours: number;
    private _minutes: number;
    private _totalMinutes: number;

    constructor(hours, minutes) {
      this._hours = hours;
      this._minutes = minutes;
      this._totalMinutes = hours * 60 + minutes;
    }

    plus(otherTime: Time): Time {
      return Time.createFromTotalMinutes(this.totalMinutes + otherTime.totalMinutes)
    }

    /**
     * 差
     * @param otherTime { Time }
     */
    minus(otherTime: Time): Time {
      if(this.totalMinutes < otherTime.totalMinutes) {
        return Time.createFromTotalMinutes((this.totalMinutes + 24 * 60) - otherTime.totalMinutes)
      }
      return Time.createFromTotalMinutes(this.totalMinutes - otherTime.totalMinutes)
    }

    formatedValue(): string { return `${Time.zerofil2(this.hours)}:${Time.zerofil2(this.minutes)}` }

    static createFromTotalMinutes(m) { return new Time(Math.floor(m / 60), m % 60); }
    static createFromDate(date: Date): Time { return new Time(date.getHours(), date.getMinutes());}
    static zero(): Time { return new Time(0, 0); }
    static zerofil2(num): string { return `0${num}`.slice(-2); }

    static parse(text: string): Time {
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

  export interface Task {
    title: string;
    startTime: Time;
    endTime: Time;
    isTodo: boolean;
    isSchedule: boolean;
    isDone: boolean;
    estimateTime: Time;
  }

  export class TodoTask implements Task {
    get title(): string { return this._title; }
    get startTime(): Time { return this._startTime; }
    get endTime(): Time { return this._endTime; }
    get isTodo(): boolean { return this._isTodo; }
    get isSchedule(): boolean { return this._isSchedule; }
    get isDone(): boolean { return this._isDone; }
    get estimateTime(): Time { return this._estimateTime; }
    get state(): string { return this._state; }

    private _title: string;
    private _startTime: Time;
    private _endTime: Time;
    private _isTodo: boolean;
    private _isSchedule: boolean;
    private _isDone: boolean;
    private _estimateTime: Time;
    private _state: string;
    private constructor(title: string, estimateTime: Time, startTime: Time, endTime: Time) {
      this._title = title;
      this._startTime = startTime;
      this._endTime = endTime;
      this._isTodo = true;
      this._isSchedule = false;
      this._isDone = endTime != null;

      if(this.startTime) {
        if(this.isDone) {
          this._state = 'done'
        } else {
          this._state = 'doing'
        }
      } else {
        this._state = 'todo'
      }

      this._estimateTime = estimateTime;
    }

    static todo(title: string, estimateTime: Time) {
      return new TodoTask(title, estimateTime, null, null);
    }
    static doing(title: string, estimateTime: Time, startTime: Time) {
      return new TodoTask(title, estimateTime, startTime, null);
    }
    static done(title: string, estimateTime: Time, startTime: Time, endTime: Time) {
      return new TodoTask(title, estimateTime, startTime, endTime);
    }
  }

  export class ScheduleTask implements Task {
    get title(): string { return this._title; }
    get startTime(): Time { return this._startTime; }
    get endTime(): Time { return this._endTime; }
    get isTodo(): boolean { return this._isTodo; }
    get isSchedule(): boolean { return this._isSchedule; }
    get isDone(): boolean { return this._isDone; }
    get estimateTime(): Time { return this._estimateTime; }

    private _title: string;
    private _startTime: Time;
    private _endTime: Time;
    private _isTodo: boolean;
    private _isSchedule: boolean;
    private _isDone: boolean;
    private _estimateTime: Time;

    constructor(title: string, startTime: Time, endTime: Time, isDone: boolean) {
      this._title = title;
      this._startTime = startTime;
      this._endTime = endTime;
      this._isDone = isDone;
      this._isTodo = false;
      this._isSchedule = true;

      this._estimateTime = endTime.minus(startTime);
    }
  }

  export class TodoOrSchedule implements Task {
    get title(): string { return this._title; }
    get startTime(): Time { return this._startTime; }
    get endTime(): Time { return this._endTime; }
    get isTodo(): boolean { return this._isTodo; }
    get isSchedule(): boolean { return this._isSchedule; }
    get isDone(): boolean { return this._isDone; }
    get estimateTime(): Time { return this._estimateTime; }
    get actualTime(): Time { return this._actualTime; }
    get todo(): TodoTask { if(this._todo) { return this._todo; } else { throw new Error('todo is null') } }
    get schedule(): ScheduleTask { if(this._schedule) { return this._schedule; } else { throw new Error('schedule is null') } }

    private _title: string;
    private _startTime: Time;
    private _endTime: Time;
    private _isTodo: boolean;
    private _isSchedule: boolean;
    private _isDone: boolean;
    private _estimateTime: Time;
    private _actualTime: Time;

    private _todo: TodoTask;
    private _schedule: ScheduleTask;
    
    constructor(task: Task) {
      this._title = task.title;
      this._estimateTime = task.estimateTime;
      this._startTime = task.startTime;
      this._endTime = task.endTime;
      this._isDone = task.isDone;
      if(task.isTodo) {
        this._isTodo = true;
        this._isSchedule = false;
        this._todo = task as TodoTask;
      }
      if(task.isSchedule) {
        this._isTodo = false;
        this._isSchedule = true;
        this._schedule = task as ScheduleTask;
      }

      this._actualTime = this.isDone ? this.endTime.minus(this.startTime) : new Time(0, 0);
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

  export function createRenderer(renderer: any): any {
    renderer.defaultHeading = renderer.heading;
    renderer.heading = function(text, level, raw, slugger) {
      if(markdownData.taskParseNum == 1) {
        markdownData.taskParseNum = 2;
      }
      return renderer.defaultHeading(text, level, raw, slugger);
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

    return renderer;
  }

  export interface MarkdownTodo {
    todoOrSchedules: TodoOrSchedule[],
    summary: {estimate: Time, actual: Time}
  }

  export function createMarkdownTodo(markdownText: string): MarkdownTodo {
    markdownData = {
      taskParseNum: 0,
      todoOrSchedules: [],
    };
    marked(markdownText);
    
    const summary = {
      estimate: markdownData.todoOrSchedules.reduce((memo, v) => memo.plus(v.estimateTime), Time.zero()),
      actual: markdownData.todoOrSchedules.reduce((memo, v) => memo.plus(v.actualTime), Time.zero())
    }

    return {
      todoOrSchedules: markdownData.todoOrSchedules,
      summary: summary
    }
  }

  const renderer = markdowntodo.createRenderer(new marked.Renderer());
  marked.setOptions({ renderer: renderer });
}