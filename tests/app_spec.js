describe('Meister', function() {
  it('can show a problem view', function() {
    meister.showView('#problem-1');
    expect($('.view-container .problem-view').length).toEqual(1);
  });

  it('shows the landing page view when there is no hash', function() {
    meister.showView('');
    expect($('.view-container .landing-view').length).toEqual(1);
  });

  it('passes the hash view parameter to the view function', function() {
    spyOn(meister, 'problemView');
    meister.showView('#problem-42');
    expect(meister.problemView).toHaveBeenCalledWith('42');
  });

  it('triggers removingView event when removing the view', function() {
    spyOn(meister, 'triggerEvent');
    meister.showView('#problem-1');
    expect(meister.triggerEvent).toHaveBeenCalledWith('removingView', []);
  });

  it('invokes the router when loaded', function() {
    spyOn(meister, 'showView');
    meister.appOnReady();
    expect(meister.showView).toHaveBeenCalledWith(window.location.hash);
  });

  it('subscribes to the hash change event', function() {
    meister.appOnReady();
    spyOn(meister, 'showView');
    $(window).trigger('hashchange');
    expect(meister.showView).toHaveBeenCalledWith(window.location.hash);
  });

  it('can flash an element while setting the text', function() {
    var elem = $('<p>');
    spyOn(elem, 'fadeOut').and.callThrough();
    spyOn(elem, 'fadeIn');
    meister.flashElement(elem, "new text");
    expect(elem.text()).toEqual("new text");
    expect(elem.fadeOut).toHaveBeenCalled();
    expect(elem.fadeIn).toHaveBeenCalled();
  });

  it('can redirect to the main view after the last problem is answered', function() {
    var flash = meister.buildCorrectFlash(2);
    expect(flash.find('a').attr('href')).toEqual("#result");
    expect(flash.find('a').text()).toEqual("あなたの浦安マイスター度は？");
  });

  it('can trigger events on the view', function() {
    callback = jasmine.createSpy('callback');
    var div = $('<div>').bind('fooEvent', callback);
    $('.view-container').append(div);
    meister.triggerEvent('fooEvent', ['bar']);
    expect(callback).toHaveBeenCalled();
    expect(callback.calls.argsFor(0)[1]).toEqual('bar');
  });

  describe('problem view', function() {
    var view;
    beforeEach(function() {
      view = meister.problemView('1');
    });

    it('has a title that includes the problem number', function() {
      expect(view.find('.title').text()).toEqual('問題 No. 1');
    });

    it('shows the description', function() {
      expect(view.find('[data-name="description"]').text()).toEqual('浦安三社祭で知られる神社とは、清滝神社と稲荷神社とあと一つは何でしょう？');
    });
  });
});
