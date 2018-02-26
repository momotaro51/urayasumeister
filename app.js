"use strict";

var meister = {
  //phase2
  poolId: 'xxx'
};

meister.identity = new $.Deferred();

meister.problems = [
  {
    description: "浦安三社祭で知られる神社とは、清滝神社と稲荷神社とあと一つは何でしょう？",
    select1: "豊受神社",
    select2: "豊武神社",
    select3: "雷神社",
    correct: "豊受神社"
  },
  {
    description: "浦安出身のプロ野球選手はこの中の誰？",
    select1: "坂本勇人",
    select2: "阿部慎之助",
    select3: "亀井義行",
    correct: "阿部慎之助"
  },
  {
    description: "浦安市が誕生したのはいつ？",
    select1: "昭和45年",
    select2: "昭和51年",
    select3: "昭和56年",
    correct: "昭和56年"
  },
  {
    description: "浦安市と姉妹都市を結ぶ都市は？",
    select1: "オーランド市",
    select2: "ニューヨーク市",
    select3: "ロサンゼルス市",
    correct: "オーランド市"
  },
  {
    description: "浦安市を通る一般国道357号は別名なんと呼ばれているでしょう？",
    select1: "舞浜道路",
    select2: "海岸道路",
    select3: "湾岸道路",
    correct: "湾岸道路"
  },
  {
    description: "名ドラマ、101回目のプロポーズにて武田鉄矢がトラックに轢かれそうになる有名なシーンの撮影に使われた新浦安の道路の名前は？",
    select1: "湾岸ロード",
    select2: "シンボルロード",
    select3: "カリビアンロード",
    correct: "シンボルロード"
  },
  {
    description: "作家･山本周五郎氏の小説で浦安が舞台となった作品のタイトルは？",
    select1: "赤べか物語",
    select2: "青べか物語",
    select3: "茶べか物語",
    correct: "青べか物語"
  },
  {
    description: "「べか舟」をイメージした浦安名物のおかしと言えば？",
    select1: "べかもち",
    select2: "べかごおり",
    select3: "べかチョコ",
    correct: "べかチョコ"
  }
];

meister.triggerEvent = function(name, args) {
  $('.view-container>*').trigger(name, args);
}

meister.sendAwsRequest = function(req, retry) {
  var promise = new $.Deferred();
  req.on('error', function(error) {
    if (error.code === "CredentialsError") { 
      meister.identity.then(function(identity) {
        return identity.refresh().then(function() {
          return retry(); 
        }, function() {
          promise.reject(resp);
        });
      });
    } else {
      promise.reject(error); 
    }
  });
  req.on('success', function(resp) {
    promise.resolve(resp.data); 
  });
  req.send();
  return promise;
}

meister.popularAnswers = function(problemId) {
  return meister.identity.then(function() {
    var lambda = new AWS.Lambda();
    var params = {
      FunctionName: 'meister_popularAnswers',
      Payload: JSON.stringify({problemNumber: problemId})
    };
    return meister.sendAwsRequest(lambda.invoke(params), function() {
      return meister.popularAnswers(problemId);
    });
  });
}

meister.fetchAnswer = function(problemId) {
  return meister.identity.then(function(identity) {
    var db = new AWS.DynamoDB.DocumentClient();
    var item = {
      TableName: 'meister',
      Key: {
        userId: identity.id,
        problemId: problemId
      }
    };
    return meister.sendAwsRequest(db.get(item), function() {
      return meister.fetchAnswer(problemId);
    })
  });
};

meister.countAnswers = function(problemId) {
  return meister.identity.then(function(identity) {
    var db = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: 'meister',
      Select: 'COUNT',
      FilterExpression: 'problemId = :problemId',
      ExpressionAttributeValues: {':problemId': problemId}
    };
    return meister.sendAwsRequest(db.scan(params), function() {
      return meister.countAnswers(problemId);
    })
  });
}

meister.saveAnswer = function(problemId, answer) {
  return meister.identity.then(function(identity) {
    var db = new AWS.DynamoDB.DocumentClient();
    var item = {
      TableName: 'meister',
      Item: {
        userId: identity.id,
        problemId: problemId,
        answer: answer
      }
    };
    return meister.sendAwsRequest(db.put(item), function() {
      return meister.saveAnswer(problemId, answer);
    })
  });
};

meister.template = function(name) {
  return $('.templates .' + name).clone();
}

meister.applyObject = function(obj, elem) {
  for (var key in obj) {
    elem.find('[data-name="' + key + '"]').text(obj[key]);
  }
};

meister.addProfileLink = function(profile) {
  var link = meister.template('profile-link');
  link.find('a').text(profile.email);
  $('.signin-bar').prepend(link);
}

meister.flashElement = function(elem, content) {
  elem.fadeOut('fast', function() {
    elem.html(content);
    elem.fadeIn();
  });
}

meister.buildCorrectFlash = function (problemNum,result) {
  var correctFlash = meister.template('correct-flash');
  var txt = correctFlash.find('span');
  if(result){
    txt.text("正解！");
  } else {
    txt.text("残念、不正解！");
  }
  var link = correctFlash.find('a');
  if (problemNum < meister.problems.length) {
    link.attr('href', '#problem-' + (problemNum + 1));
  } else {
    link.attr('href', '#result');
    link.text("あなたの浦安マイスター度は？");
  }
  return correctFlash;
}

meister.problemView = function(data) {
  var problemNumber = parseInt(data, 10);
  var view = meister.template('problem-view');
  var problemData = meister.problems[problemNumber - 1];
  var resultFlash = view.find('.result');
  var count = 0;
  $(".check-btn").show();

  function checkAnswer() {
    var selected = $("input[name='radios']:checked").parent().find("span").text();
    return selected == problemData.correct;
  }

  function checkAnswerClick() {
    var flashContent = meister.buildCorrectFlash(problemNumber,checkAnswer());
    meister.flashElement(resultFlash, flashContent);
    meister.saveAnswer(problemNumber, checkAnswer());

    var correctcount = Cookies.get('correctcount',Number); //cookieから取得
    if (correctcount == null) { correctcount = 0;} //値が空の場合
    if(checkAnswer()) {
      correctcount = parseInt(correctcount) + 1;
    }
    Cookies.set('correctcount', correctcount ,{ path: '/' }); //cookieに保存する
    return false;
  }

  // if (problemNumber < meister.problems.length) {
  //   var buttonItem = meister.template('skip-btn');
  //   buttonItem.find('a').attr('href', '#problem-' + (problemNumber + 1));
  //   $('.nav-list').append(buttonItem);
  //   view.bind('removingView', function() {
  //     buttonItem.remove();
  //   });
  // }

  meister.fetchAnswer(problemNumber).then(function(data) {
    if (data.Item) {
      answer.val(data.Item.answer);
    }
  });

  view.find('.check-btn').click(checkAnswerClick);
  view.find('.title').text('問題 No. ' + problemNumber);
  meister.applyObject(problemData, view);
  return view;
}

meister.landingView = function() {
  Cookies.remove('correctcount');
  return meister.template('landing-view');
}

meister.profileView = function() {
  var view = meister.template('profile-view');
  meister.identity.done(function(identity) {
    view.find('.email').text(identity.email);
  });
  return view;
}

meister.resultAnnouncementView = function() {
  var view = meister.template('resultAnnouncement-view');
  var count = Cookies.get('correctcount',Number);
  var txt = "";
  var imgpath = "";
  if( count < 3) {
    txt = "白帯";
    imgpath = 'images/ama.png';
  } else if (count > 6){
    txt = "師範代";
    imgpath = 'images/pro.jpg';
  } else {
    txt = "黒帯";
    imgpath = 'images/kuroobi.png';
  }
  view.find('.level').text(txt);
  view.find('.levelimg').attr("src",imgpath);
  Cookies.remove('correctcount');
  return view;
}

meister.showView = function(hash) {
  var routes = {
    '#problem': meister.problemView,
    '#profile': meister.profileView,
    '#result': meister.resultAnnouncementView,
    '#': meister.landingView,
    '': meister.landingView
  };
  var hashParts = hash.split('-');
  var viewFn = routes[hashParts[0]];
  if (viewFn) {
    meister.triggerEvent('removingView', []);
    $('.view-container').empty().append(viewFn(hashParts[1]));
  }
}

meister.appOnReady = function() {
  window.onhashchange = function() {
    meister.showView(window.location.hash);
  };
  meister.showView(window.location.hash);
  meister.identity.done(meister.addProfileLink);
}

meister.awsRefresh = function() {
  var deferred = new $.Deferred();
  AWS.config.credentials.refresh(function(err) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(AWS.config.credentials.identityId);
    }
  });
  return deferred.promise();
}

function googleSignIn(googleUser) {
  var id_token = googleUser.getAuthResponse().id_token;
  AWS.config.update({
    region: 'us-east-1',
    credentials: new AWS.CognitoIdentityCredentials({
      IdentityPoolId: meister.poolId,
      Logins: {
        'accounts.google.com': id_token
      }
    })
  })
  function refresh() {
    return gapi.auth2.getAuthInstance().signIn({
        prompt: 'login'
      }).then(function(userUpdate) {
      var creds = AWS.config.credentials;
      var newToken = userUpdate.getAuthResponse().id_token;
      creds.params.Logins['accounts.google.com'] = newToken;
      return meister.awsRefresh();
    });
  }
  meister.awsRefresh().then(function(id) {
    meister.identity.resolve({
      id: id,
      email: googleUser.getBasicProfile().getEmail(),
      refresh: refresh
    });
  });
}
