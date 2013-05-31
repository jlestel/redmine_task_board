require 'redmine'
require 'redmine_task_board_hook_listener'

Rails.configuration.to_prepare do
  require_dependency 'projects_helper'
  ProjectsHelper.send(:include, RedmineTaskBoardSettingsPatch) unless ProjectsHelper.included_modules.include?(RedmineTaskBoardSettingsPatch)
end

Redmine::Plugin.register :redmine_task_board do
  name 'Redmine Task Board'
  author 'Julien Lestel'
  description 'Add a Kanban-style task board tab to projects'
  version '0.0.2'
  url 'https://github.com/jlestel/redmine_task_board'
  author_url '#'

  project_module :taskboard do
    permission :edit_taskboard, {:projects => :settings, :taskboard => [:create_column, :delete_column, :update_columns]}, :require => :member
    permission :view_taskboard, {:taskboard => [:index, :save, :archive_issues, :unarchive_issue, :delete_issues]}, :require => :member
  end
  menu :top_menu, :taskboard, { :controller => 'my_taskboard', :action => 'my_index' }, :caption => 'Mes taches', :before => :projects
  menu :project_menu, :taskboard, { :controller => 'taskboard', :action => 'index' }, :caption => 'Kanban', :before => :issues, :param => :project_id
end