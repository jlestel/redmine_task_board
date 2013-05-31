/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
(function(){
  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
  this.Class = function(){};
  Class.extend = function(prop) {
    var _super = this.prototype;
    initializing = true;
    var prototype = new this();
    initializing = false;
    for (var name in prop) {
      prototype[name] = typeof prop[name] == "function" &&
        typeof _super[name] == "function" && fnTest.test(prop[name]) ?
        (function(name, fn){
          return function() {
            var tmp = this._super;
            this._super = _super[name];
            var ret = fn.apply(this, arguments);        
            this._super = tmp;
            return ret;
          };
        })(name, prop[name]) :
        prop[name];
    }
    function Class() {
      if ( !initializing && this.init )
        this.init.apply(this, arguments);
    }
    Class.prototype = prototype;
    Class.prototype.constructor = Class;
    Class.extend = arguments.callee;
   
    return Class;
  };
})();

var TaskBoardSortable = Class.extend({
  
  sortable: null,
  id: null,
  options: {},
  
  init: function(id, options) {
    this.id = id;
    this.options = options;
    this.options.change = this.onChange.bind(this);
    this.options.update = this.onUpdate.bind(this);
    this.root = $('#' + this.id);
    this.root.sortable(this.options);
  },
  
  onChange: function() { },

  onUpdate: function() { }

});

var TaskBoardPane = TaskBoardSortable.extend({

  init: function(id, options) {
    this._super(id, options);
    this.max_issues = parseInt(this.root.data('max-issues'));
    this.root.data('card-count', this.getNumberOfCards());
  },

  getNumberOfCards: function() {
    return this.root.find('.card').length;
  },

  onUpdate: function(e, ui) {
    // Add or remove 'empty' class
    var list = ui.item.parent();
    if (list.hasClass('empty') && list.find('.card').length > 0) {
      list.removeClass('empty');
    }
    else if (list.find('.card').length == 0) {
      list.addClass('empty');
    }

    // Deal with max issue limit
    if (this.max_issues > 0 && this.root.find('.card').length > this.max_issues) {
      var i = 1;
      var self = this;
      this.root.find('.card').each(function() {
        // Clear legal cards of the over-limit class
        if (i <= self.max_issues) {
          $(this).removeClass('over-limit');
        }

        // Add a dashed line under the last legal issue, reset others
        if (self.max_issues == i) {
          $(this).addClass('at-limit');
        }
        else {
          $(this).removeClassName('at-limit');
        }

        // Add over-limit class to over-limit issues
        if (i > self.max_issues) {
          $(this).addClass('over-limit');
        }
        i++;
      });
    }
    else {
      this.root.find('.card').each(function() {
        $(this).removeClass('over-limit');
        $(this).removeClass('at-limit');
      });
    }

    // handle card movements

    // a card has been moved into this column.
    if (this.getNumberOfCards() > list.data('card-count')) {
      list.find('.card').each(function() {
        if (list.data('status-id') != $(this).data('status-id')) {
          TaskBoardUtils.save([
            TaskBoardUtils.column_serialize(list), // save ordering of this column
            TaskBoardUtils.column_serialize($('#' + 'column_' + $(this).data('status-id'))), // save ordering of previous column
            TaskBoardUtils.moveParam($(this).data('issue-id'), list.data('status-id'))
          ], {
            onSuccess: function() {
              $(this).data('status-id', list.data('status-id'));
            }
          });
        }
      });
    }

    // this column has been reordered
    else if(this.getNumberOfCards() == list.data('card-count')) {
      TaskBoardUtils.save([TaskBoardUtils.column_serialize(list)]);
    }

    // We don't handle (this.getNumberOfCards() < $(this.id).readAttribute('data-card-count'))
    // because the gaining column handles re-weighting for the losing column for AJAX efficiency.

    list.data('card-count', this.getNumberOfCards());
  },

});

var MyTaskBoardPane = TaskBoardSortable.extend({

  init: function(id, options) {
    this._super(id, options);
    this.root.data('card-count', this.getNumberOfCards());
  },

  getNumberOfCards: function() {
    return this.root.find('.card').length;
  },

  onUpdate: function(e, ui) {
    // Add or remove 'empty' class
    var list = ui.item.parent();
    if (list.hasClass('empty') && list.find('.card').length > 0) {
      list.removeClass('empty');
    }
    else if (list.find('.card').length == 0) {
      list.addClass('empty');
    }

    var priority_list = [];
    $('#prioritized').find('li.card').each(function() {
      priority_list.push('sort[]=' + $(this).data('issue-id'));
    });
    TaskBoardUtils.save(priority_list);

    // We don't handle (this.getNumberOfCards() < $(this.id).readAttribute('data-card-count'))
    // because the gaining column handles re-weighting for the losing column for AJAX efficiency.


    list.data('card-count', this.getNumberOfCards());
  },

});

var TaskBoardUtils = {

  column_serialize: function(list) {
    var params = [];
    list.find('.card').each(function() {
      params.push('sort[' + list.data('status-id') + '][]=' + $(this).data('issue-id'));
    });
    return params.join('&');
  },

  moveParam: function(issue_id, new_status_id) {
    return 'move[' + issue_id + ']=' + new_status_id;
  },

  save: function(params) {
    $('#ajax-indicator').show();
    $.ajax(project_save_url, {
      type: 'post',
      data: params.join('&'),
      complete: function() {
        $('#ajax-indicator').hide();
      }
    });
  },

  comboboxListeners: function() {
    // Add listeners on comboboxes
    $("#filter_search").keyup(this.filterCards);
    $("#project_parent_id").change(this.filterCards);
    $("#filter_creator_id").change(this.filterCards);
    $("#filter_user_id").change(this.filterCards);
    $("#include_sub_project").change(this.filterCards);
    $( "#from" ).change(this.filterCards);
    $( "#to" ).change(this.filterCards);

    $("#evolutions").click(this.filterCards);
    $("#bug").click(this.filterCards);
    $("#critical_date").click(this.filterCards);
  },

  filterCards: function() {

    if (this.classList.contains("sample")) {
      if ($("#filter_type_tracker")[0].classList.contains(this.id)) {
        $("#filter_type_tracker").removeClass(this.id);
        $("#"+this.id).removeClass('selected');
      } else {
        $("#filter_type_tracker").addClass(this.id);
        $("#"+this.id).addClass('selected');
      }
    }

    // Browse all cards
    $(".card").each(function(index) {
      var filter_search = $("#filter_search")[0].value;
      var filter_project = $("#project_parent_id")[0].value;
      var filter_creator = $("#filter_creator_id")[0].value;
      var filter_assignee = $("#filter_user_id")[0].value;
      var filter_type_tracker = $("#filter_type_tracker")[0].classList;
      var include_sub_project = $("#include_sub_project")[0].checked;
      var from_date = $("#from")[0].value;
      var to_date = $("#to")[0].value;

      var card_project = this.attributes['data-project-id'].value;
      var card_creator = this.attributes['data-author-id'].value;
      var card_creator_label = this.attributes['data-author-label'].value;
      var card_assignee = this.attributes['data-assignee-id'].value;
      var card_assignee_label = this.attributes['data-assignee-label'].value;
      var card_label = this.attributes['data-label'].value;
      var card_date_start = this.attributes['data-date-start'].value;
      var card_date_end = this.attributes['data-date-end'].value;

      // Get sub projects
      var sub_projects = '';
      var display = true;

      if (filter_search != '') {
        display = (
          card_label.toLowerCase().indexOf(filter_search) >= 0 ||
          card_creator_label.toLowerCase().indexOf(filter_search) >= 0 ||
          card_assignee_label.toLowerCase().indexOf(filter_search) >= 0
          );
      }

      if (display && filter_type_tracker.length) {
        for(var cpt=0; cpt < filter_type_tracker.length; cpt++) {
          if (!this.classList.contains(filter_type_tracker[cpt]))
            display = false;
        }
      }

      // Hide checkbox if there's no sub-projects
      if (display && filter_project != '') {
        sub_projects = $("#project_" + filter_project)[0].value;
        var label = $("#label_chk_sub_project");
        (sub_projects != "") ? label.show() : label.hide();
      }     

      // Filter by creator
      if (display && filter_creator != '' && card_creator != filter_creator)
        display = false;

      // Filter by assignee
      if (display && filter_assignee != '' && card_assignee != filter_assignee)
        display = false;

      // Filter by project
      if (display && filter_project != '' && card_project != filter_project) {
        display = false;
        if (include_sub_project) {
          // Search if card project is in sub-projects of current project filtered
          if (sub_projects != "") {
            if (sub_projects.split(",").indexOf(card_project) >= 0)
              display = true;
          }
        }
      }

      if (display && from_date != '')
          display = Date.parse(from_date) <= Date.parse(card_date_start);

      if (display && to_date != '') {
        display = Date.parse(to_date) >= Date.parse(card_date_end) && card_date_end != '';
        if (display) {
          console.log(Date.parse(to_date) +'-'+ Date.parse(card_date_end) + '-' + card_label );
        }
      }

      // Display card if needed
      (display) ? $(this).show() : $(this).hide();
    });  
  },

  checkboxListener: function() {
    TaskBoardUtils.hideButtonsIfNoneChecked();
    $(document).on('click', '.card input[type="checkbox"]', function() {
      if (!$('#taskboard-buttons').is(':visible') && this.checked) {
        $('#taskboard-buttons').show();
      }
      if (!this.checked) {
        TaskBoardUtils.hideButtonsIfNoneChecked();
      }
    });

    $(document).on('click', '#edit-issues', function() {
      location.href = '/issues/bulk_edit?' + TaskBoardUtils.serializeCheckedButtons();
    });

    $(document).on('click', '#archive-issues', function() {
      $('#ajax-indicator').show();
      $.ajax(project_archive_url, {
        type: 'post',
        data: TaskBoardUtils.serializeCheckedButtons(),
        complete: function() {
          $('#ajax-indicator').hide();
        },
        success: function() {
          $('.card input[type="checkbox"]').each(function() {
            if ($(this).is(':checked')) {
              $('#issue_' + $(this).val()).remove();
            }
          });
        }
      });
    });

    $(document).on('click', '#delete-issues', function() {
      $('#ajax-indicator').show();
      $.ajax(project_delete_url, {
        type: 'post',
        data: TaskBoardUtils.serializeCheckedButtons(),
        complete: function() {
          $('#ajax-indicator').hide();
        },
        success: function() {
          $('.card input[type="checkbox"]').each(function() {
            if ($(this).is(':checked')) {
              $('#issue_' + $(this).val()).remove();
            }
          });
        }
      });
    });
  },

  hideButtonsIfNoneChecked: function() {
    var found_checked = false;
    $('.card input[type="checkbox"]').each(function() {
      if (this.checked) {
        found_checked = true;
        return false;
      }
    });
    if (!found_checked) {
      $('#taskboard-buttons').hide();
    }
  },

  serializeCheckedButtons: function() {
    var params = [];
    $('.card input[type="checkbox"]').each(function() {
      if (this.checked) {
        params.push('ids[]=' + $(this).val());
      }
    });
    return params.join('&');
  }
}

var TaskBoardSettings = TaskBoardSortable.extend({
  
  onUpdate: function(e, ui) {
    var weight = 0;
    var self = this;
    this.root.find(this.options.items).each(function() {
      var weightInput = $(this).find(self.options.weightSelector);
      if ($(weightInput).length > 0) $(weightInput).val(weight++);
    });
  }

});