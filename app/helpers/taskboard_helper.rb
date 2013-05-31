module TaskboardHelper
	def parent_project_select_tag(project)
	    #puts YAML::dump(project)

	    # retrieve the requested parent project
	    #parent_id = (params[:project] && params[:project][:parent_id]) || params[:parent_id]
	    #if parent_id
	    #  selected = (parent_id.blank? ? nil : Project.find(parent_id))
	    #end

	    options = ''
	    options << "<option value=''>" + ucfirst(l(:label_all)) + "</option>" #if project.descendants.include?(nil)
	    options << project_tree_options_for_select(project.descendants.compact, :selected => project)
	    content_tag('select', options.html_safe, :name => 'project[parent_id]', :id => 'project_parent_id')
	end

	# Returns a string for users/groups option tags
	def principals_options_for_select(project, selected=nil)
		s = ''
		if project.users.include?(User.current)
		  s << content_tag('option', "<< #{ucfirst(l(:label_me))} >>", :value => User.current.id)
		end

		users = Array.new
		
		users.concat(project.users)
		project.descendants.each do |sub_project|
	    	users.concat(sub_project.users)
	    end

		groups = ''
		users.uniq.sort.each do |element|
		  selected_attribute = ' selected="selected"' if option_value_selected?(element, selected)
		  (element.is_a?(Group) ? groups : s) << %(<option value="#{element.id}"#{selected_attribute}>#{h element.name}</option>)
		end
		unless groups.empty?
		  s << %(<optgroup label="#{h(l(:label_group_plural))}">#{groups}</optgroup>)
		end
		s.html_safe
	end

	# Return a string for all sub-projects containing sub-projects id's
	def sub_project_fields(project)
		s = ''
		project.descendants.each do |sub_project|
			opts = Array.new
			s << '<input type="hidden" id="project_'+sub_project.id.to_s+'" value="'+recursive_project_ids(sub_project).join(',')+'"/>'
		end
		s.html_safe
	end

	def recursive_project_ids(project)
		s = ''
		arr = Array.new
		project.descendants.each do |sub_project|
			arr.push(sub_project.id)
			arr.concat(recursive_project_ids(sub_project))
		end
		arr
	end

	def ucfirst(string)
    	string.gsub(/(\w+)/) { |s| s.capitalize }
  	end

  	def show_project_path(issue, project)
  		arr = Array.new
  		parents = issue.project.self_and_ancestors
  		found_parent = false
  		parents.each do |parent|
  			if (found_parent)
  				arr.push(link_to(parent.name, :controller => :projects, :action => :show, :id => parent.id))
  			end

  			if (project.id == parent.id)
  				found_parent = true
  			end
  		end
  		arr.join(" / ").html_safe
  	end

  	def show_critical_date(date_release)
  		res = false
  		if date_release
  			diff = (Date.today - date_release.to_date).to_i
			res = (diff >= -3) && (diff < 2)	
  		end
  		res
  	end
end
