// 获取画布
var cv = document.querySelector('#cv');
var ctx = cv.getContext('2d');

// 获取元素
var btn = document.querySelector('.btn img'); // 表情
var nowTime = document.querySelector('.time'); // 当前用时
var fastestTime = document.querySelector('.fastestTime'); // 最快用时

// 从本地存储中获取
if(localStorage.fastestTime) {
    fastestTime.innerHTML = '最快用时：' + localStorage.fastestTime;
}

var isStartTime = true; // 是否开始记时，每局游戏第一次点击就开始记时
var usingTimer; // 计时计时器
var hour = 0,min = 0,sec = 0; // 这局的用时
var thisTime; // 当局用时(字符串)

// 全局变量
var col = 30,row = 15; // 行和列
var size = 30; // 大小

// 根据行和列计算出canvas的宽高
var cvw = col * size,cvh = row * size;
cv.width = cvw;
cv.height = cvh;

var allRect = []; // 所有方块

var thunderNum = 100; // 雷的数量
var thunderArr = []; // 承放所有的雷,方便最后批量设置

// 被标记的雷的数量，如果这个数量等于雷的数量，游戏结束，赢游戏
var pointThunderNum = 0;
// 被标记的元素数组，如果这个数组的长度为thunderNum且数组里的元素都是雷，就赢得游戏
var pointArr = [];

// 游戏是否结束的标记位，如果这个值为true，代表游戏结束，不能再点击画布
var isOver = false;
var overThunderTimer; // 游戏结束雷闪烁的计时器

// 随机数函数
function rn(min,max) {
    return Math.round(Math.random() * (max - min) + min);
}

/* 小块类
   x,y : 小块左上角的坐标
   bg: 被标记为绿色，未被标记未灰色
   isThunder: 布尔类型，true代表是雷，false代表不是雷
   isPoint: 是否被标记，被标记true，未被标记false
 */
function Rect(x,y,bg,isThunder,isPoint) {
    this.x = x;
    this.y = y;
    this.bg = 'images/' + rn(1,12) + '.png';
    this.isThunder = isThunder;
    this.isPoint = isPoint;
    this.isJudge = false; // 是否已经被判断了(防止发生判断的死循环)
}
Rect.prototype.draw = function() {
    ctx.beginPath();
    var newImage = new Image();
    newImage.src = this.bg;
    newImage.startX = this.x;
    newImage.startY = this.y;
    // 图片加载是异步的过程，想要将图片绘制在画布上，要先让其onload，每个图片都有一个onload事件，但是每个图片绘制的坐标都不一样，所以将这个图片应该绘制的位置坐标绑定给图片对象
    newImage.onload = function() {
        // 这个函数里的this指的是当前完成加载的这张图片
        ctx.drawImage(this,this.startX,this.startY,size,size);
    };
};


// 绘制背景
function drawBg() {
    for(var i = 0; i < row + 2; i++) {
        var oneRow = [];
        var nowy = (i - 1) * size;
        for(var j = 0; j < col + 2; j++) {
            var nowx = (j - 1) * size;
            var rect = new Rect(nowx,nowy,'#eee',false,false);
            oneRow.push(rect);
            rect.draw();
        }
        allRect.push(oneRow);
    }
}
drawBg();

// 创建类(随机一个二维的坐标)
function createOneThunder() {
    var rowIndex = rn(1,row);
    var colIndex = rn(1,col);
    // 如果当前位置已经有雷，那要重新生成一个坐标
    if(allRect[rowIndex][colIndex].isThunder) {
        createOneThunder();
        return;
    }
    // 如果这个位置可用，将这个位置对象的isThunder改为true
    allRect[rowIndex][colIndex].isThunder = true;
    // 将当前元素放进雷的数组
    thunderArr.push(allRect[rowIndex][colIndex]);
}

function createManyThunder() {
    for(var i = 0; i < thunderNum; i++) {
        createOneThunder();
    }
}
createManyThunder();

function touchThunder() {
    // 踩到雷，清除记时的计时器
    clearInterval(usingTimer);
    btn.src = 'images/sad.png';
    // 如果踩到雷，那么页面中所有的雷都要展示
    var flag = true;
    overThunderTimer = setInterval(function() {
        for(var i = 0; i < thunderArr.length; i++) {
            // 先把这个位置上之前的东西清除
            ctx.clearRect(thunderArr[i].x,thunderArr[i].y,size,size);
            if(flag) {
                thunderArr[i].bg = 'images/worm.png';
                thunderArr[i].draw();
            } else {
                ctx.fillStyle = '#fff';
                ctx.fillRect(thunderArr[i].x,thunderArr[i].y,size,size);
            }
        }
    },100);
    setTimeout(function() {
        clearInterval(overThunderTimer);
    },3000);
}

var judgeTime = 0; // 雷太少，可能一点一大片全部展开了，为了增强游戏刺激体验，让它判断了500个格子就直接停止(如果不明白这是什么意思，对比这个变量加与不加的游戏区别)
// 判断一个雷周围有几个雷，如果没有雷，要让它周围九宫格的元素都展开
function judgeOne(rowIndex,colIndex) {
    judgeTime++;
    if(judgeTime > 58) {
        return;
    }
    var thisRect = allRect[rowIndex][colIndex];

    // 点到雷
    if(thisRect.isThunder) {
        touchThunder();
        isOver = true;
        return;
    }

    // 如果当前元素已经被判断过了，或当前元素被标记，直接return
    if(thisRect.isJudge || thisRect.isPoint) {
        return;
    }
    // 如果当前元素没有被判断过，即将要判断这个元素，将这个元素的isJudge标记为true
    thisRect.isJudge = true;

    var roundThunderNum = 0; // 当前元素周围的雷的数量，初始值为0
    // 左上角：
    if(allRect[rowIndex - 1][colIndex - 1].isThunder) {roundThunderNum++;}
    // 正上方
    if(allRect[rowIndex - 1][colIndex].isThunder) {roundThunderNum++;}
    // 右上角
    if(allRect[rowIndex - 1][colIndex + 1].isThunder) {roundThunderNum++;}
    // 左下角
    if(allRect[rowIndex + 1][colIndex - 1].isThunder) {roundThunderNum++;}
    // 正下方
    if(allRect[rowIndex + 1][colIndex].isThunder) {roundThunderNum++;}
    // 右下角
    if(allRect[rowIndex + 1][colIndex + 1].isThunder) {roundThunderNum++;}
    // 左边
    if(allRect[rowIndex][colIndex - 1].isThunder) {roundThunderNum++;}
    // 右边
    if(allRect[rowIndex][colIndex + 1].isThunder) {roundThunderNum++;}

    ctx.fillStyle = '#fff';
    ctx.fillRect(thisRect.x,thisRect.y,size,size);
    if(roundThunderNum == 0) {
        // 如果当前块周围没有雷，那么周围的九宫格都要打开
        if(rowIndex != 1) {
            // 不是第一行，就可以连续的判断正上方
            judgeOne(rowIndex - 1,colIndex);
        }

        if(rowIndex != row) {
            // 不是最后一行，就可以连续的取判断正下方
            judgeOne(rowIndex + 1,colIndex);
        }

        if(colIndex != 1) {
            // 不是最左边，就可以取判断左边
            judgeOne(rowIndex,colIndex - 1);
        }

        if(colIndex != col) {
            // 不是最右边一列，就可以去判断右边元素
            judgeOne(rowIndex,colIndex + 1);
        }

        if(rowIndex != 1 && colIndex != 1) {
            // 不是第一排，也不是最左边一列，就可以判断左上角元素
            judgeOne(rowIndex - 1,colIndex - 1);
        }

        if(rowIndex != 1 && colIndex != col) {
            // 不是第一排也不是最右边一列，就可以判断右上角元素
            judgeOne(rowIndex - 1,colIndex + 1);
        }

        if(rowIndex != row && colIndex != 1) {
            // 不是最左边一列也不是最下面一排，就可以判断左下角元素
            judgeOne(rowIndex + 1,colIndex - 1);
        }

        if(rowIndex != row && colIndex != col) {
            // 不是最右边一列也不是最下面一排，就可以判断右下角的元素
            judgeOne(rowIndex + 1,colIndex + 1);
        }
    } else {
        ctx.font = '18px Aria';
        ctx.fillStyle = '#000';
        ctx.fillText(String(roundThunderNum),size * (colIndex - 1) + 8,size * (rowIndex) - 7);
    }
}

// 记时
function getTime() {
    if(isStartTime) {
        usingTimer = setInterval(function() {
            sec++;
            if(sec == 59) {
                min++;
                sec = 0;
                if(min == 59) {
                    hour++;
                    min = 0;
                }
            }
            thisTime = String(hour < 10 ? '0' + hour : hour)+ ':' + String(min < 10 ? '0' + min : min)+ ':' + String(sec < 10 ? '0' + sec : sec);
            nowTime.innerHTML = '用时: ' + thisTime;
        },1000);
        isStartTime = false;
    }
}

// 将本局时间与本地存储中的时间做对比
function setStorage() {
    // 游戏过关，将这局游戏的时间和本地存储最块时间做对比
    if(localStorage.fastestTime) {
        // 如果本地存储中有分数，从本地存储中分别截取出小时，分钟，秒钟
        var h = Number(localStorage.fastestTime.substr(0, 2));
        var m = Number(localStorage.fastestTime.substr(3, 2));
        var s = Number(localStorage.fastestTime.substr(6, 2));

        // 如果本地存储中的分数小于当前分数,就将当前分数存储在本地
        if(hour == h) {
            if(min == m) {
                if(sec < s) {
                    localStorage.fastestTime = thisTime;
                    fastestTime.innerHTML = '最快用时: ' + thisTime;
                }
            } else if(min < m) {
                localStorage.fastestTime = thisTime;
                fastestTime.innerHTML = '最快用时: ' + thisTime;
            }
        } else if(hour < h) {
            localStorage.fastestTime = thisTime;
            fastestTime.innerHTML = '最快用时: ' + thisTime;
        }
    } else {
        // 如果本地存储中没有分数,就直接将当前的分数存储在本地
        localStorage.fastestTime = thisTime;
        fastestTime.innerHTML = '最快用时: ' + thisTime;
    }
}

// 画布的点击事件
function cvEvent() {
    // 如果游戏已经结束(点击或右击canvas不给任何反馈)
    cv.onclick = function(ev) {
        getTime(); // 计算时间
        judgeTime = 0; // 第二次点击，重新对judgeNum计次
        if(isOver) {return;}
        var e = ev || window.event;
        var x = e.clientX - cv.offsetLeft;
        var y = e.clientY - cv.offsetTop;
        if(allRect[parseInt(y / size) + 1][parseInt(x / size) + 1].isPoint) {
            return;
        }
        // 获取到点击的小方块在二维数组中的坐标👇👇👇👇(size指小方块的大小)
        judgeOne(parseInt(y / size) + 1,parseInt(x / size) + 1);
    };

    // canvas的鼠标右击事件，右击标记雷
    document.oncontextmenu = function(ev) {
        if(isOver) {return;}
        getTime(); //计算时间
        var e = ev || window.event;
        e.preventDefault();
        // 获取当前右击的点的坐标
        var x = e.clientX - cv.offsetLeft;
        var y = e.clientY - cv.offsetTop;
        // 计算出右击的对象
        var rowIndex = parseInt(y / size) + 1;
        var colIndex = parseInt(x / size) + 1;
        var thisRect = allRect[rowIndex][colIndex];
        // 如果当前元素未被标记，在当前位置绘制旗帜，如果当前元素已经被标记，在当前位置绘制水果
        var newImage = new Image();
        ctx.clearRect(thisRect.x,thisRect.y,size,size);
        if(thisRect.isPoint) {
            newImage.src = 'images/' + rn(1,12) + '.png';
            thisRect.isPoint = false;
            // 将当前元素从被标记的数组中移除
            pointArr.splice(pointArr.indexOf(thisRect),1);
        } else {
            newImage.src = 'images/flag.png';
            thisRect.isPoint = true;
            // 将当前标记的这个元素添加到被标记的元素数组中
            pointArr.push(thisRect);
        }
        newImage.onload = function() {
            ctx.drawImage(newImage,thisRect.x,thisRect.y,size,size);
        };

        // 判断雷是否全部扫出来
        if(isWin()) {
            clearInterval(usingTimer);
            isOver = true;
            setStorage();
            btn.src = 'images/happy.png';
        }
    };

    // 循环pointArr，如果其中的所有元素都是雷，那么赢得游戏
    function isWin() {
        if(pointArr.length == thunderNum) {
            for(var i = 0; i < pointArr.length; i++) {
                if(!pointArr[i].isThunder) {
                    break;
                }
            }
            if(i == pointArr.length) {
                return true;
            }
        }
        return false;
    }

    // 笑脸的点击事件，点击一次重新开始游戏
    btn.onclick = function() {
        clearInterval(overThunderTimer);
        setTimeout(function() {
            btn.src = 'images/o.png';

            // 重新绘制之前先清除画布
            ctx.clearRect(0,0,cvw,cvh);

            // 重新创建背景
            allRect = [];
            drawBg();

            // 绘制雷
            thunderArr = [];
            createManyThunder();

            // 当局时间恢复原样
            hour = 0,min = 0,sec = 0;
            thisTime = '00:00:00';
            nowTime.innerHTML = '用时: ' + thisTime;
            isStartTime = true;

            // 被标记的雷的数组置空
            pointArr = [];

            isOver = false;
        },200);
    };
}
cvEvent();


















//