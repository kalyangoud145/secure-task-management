/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, OnInit } from '@angular/core';
import { TaskService } from '../../services/task.service';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task } from '@secure-task-mangement/data';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})

export class DashboardComponent implements OnInit {
  isAuthenticated = false;
  loginData = { username: '', password: '' };
  loginError = '';
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  categories: string[] = [];
  filter = { category: '', status: '' };
  sort = '';
  showTaskModal = false;
  editingTask: Task | null = null;
  taskForm = { title: '', description: '', category: '', status: 'Todo' };
  dragIndex: number | null = null;
  taskError = '';
  showToast = false;
  private taskService = inject(TaskService);

  ngOnInit() {
    // Check for valid token before showing login
    // For page refreshes if the token is still valid we should not show login
    // and load tasks directly
    const token = this.taskService.getJwt();
    if (token && this.taskService.isTokenValid(token)) {
      this.isAuthenticated = true;
      this.loadData();
    } else {
      this.isAuthenticated = false;
    }
    this.taskService.getTasksObservable().subscribe(tasks => {
      this.tasks = tasks;
      this.applyFilters();
    });
    this.taskService.getCategoriesObservable().subscribe(cats => this.categories = cats);
  }

  login() {
    this.loginError = '';
    this.taskService.login(this.loginData.username, this.loginData.password)
      .subscribe({
        next: res => {
          this.isAuthenticated = true;
          this.taskService.setJwt(res.access_token);
          this.loadData();
        },
        error: () => {
          this.loginError = 'Invalid credentials';
        }
      });
  }

  logout() {
    this.isAuthenticated = false;
    this.taskService.setJwt('');
    this.tasks = [];
    this.filteredTasks = [];
    this.loginData = { username: '', password: '' };
  }

  loadData() {
    this.taskService.fetchTasks();
   // this.taskService.fetchCategories();
  }

  applyFilters() {
    let tasks = [...this.tasks];
    if (this.filter.category) {
      tasks = tasks.filter(t => t.category === this.filter.category);
    }
    if (this.filter.status) {
      tasks = tasks.filter(t => t.status === this.filter.status);
    }
    if (this.sort === 'order') {
      tasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    } else if (this.sort === 'status') {
      // Sort by status: Todo < Inprogress < Done (case-insensitive)
      const statusOrder = ['todo', 'inprogress', 'done'];
      tasks.sort((a, b) => {
        const aStatus = (a.status || '').toLowerCase();
        const bStatus = (b.status || '').toLowerCase();
        return statusOrder.indexOf(aStatus) - statusOrder.indexOf(bStatus);
      });
    }
    this.filteredTasks = tasks;
  }

  openCreateTask() {
    this.taskError = '';
    this.editingTask = null;
    this.taskForm = { title: '', description: '', category: '', status: 'Todo' };
    this.showTaskModal = true;
  }

  openEditTask(task: Task) {
    this.taskError = '';
    this.editingTask = task;
    this.taskForm = { ...task };
    this.showTaskModal = true;
  }

  closeTaskModal() {
    this.showTaskModal = false;
  }

  // hide error  message after 1 min
  setTaskError(msg: string) {
    this.taskError = msg;
    setTimeout(() => {
      this.taskError = '';
    }, 60000);
  }

  saveTask() {
    this.taskError = '';
    if (this.editingTask) {
      this.taskService.editTask(this.editingTask.id, this.taskForm)
        .subscribe({
          next: () => {
            this.loadData();
            this.closeTaskModal();
          },
          error: () => {
            this.setTaskError('Error updating task or you do not have permission');
          }
        });
    } else {
      this.taskService.createTask(this.taskForm)
        .subscribe({
          next: () => {
            this.loadData();
            this.closeTaskModal();
          },
          error: () => {
            this.setTaskError('Error creating task or you do not have permission');
          }
        });
    }
  }

  deleteTask(id: number) {
    this.taskError = '';
    this.taskService.deleteTask(id)
      .subscribe({
        next: () => this.loadData(),
        error: () => {
          this.setTaskError('Error deleting task or you do not have permission');
        }
      });
  }

  // Drag-and-drop logic
  onDragStart(index: number) {
    if (this.sort !== 'order') return;
    const taskId = this.filteredTasks[index]?.id;
    this.dragIndex = this.tasks.findIndex(t => t.id === taskId);
  }

  onDragOver(event: DragEvent) {
    if (this.sort !== 'order') return;
    event.preventDefault();
  }

  // ondrop only works if sorting by order to make it clear to the user to observe the changes
  onDrop(index: number) {
    this.taskError = '';
    if (this.sort !== 'order') return;
    if (this.dragIndex === null) return;
    const dropTaskId = this.filteredTasks[index]?.id;
    const dropIndex = this.tasks.findIndex(t => t.id === dropTaskId);
    if (this.dragIndex === dropIndex) {
      this.dragIndex = null;
      return;
    }
    const movedTask = this.tasks[this.dragIndex];
    this.tasks.splice(this.dragIndex, 1);
    this.tasks.splice(dropIndex, 0, movedTask);
    this.tasks.forEach((task, i) => {
      this.taskService.updateTaskOrder(task.id, i).subscribe({
        error: () => {
          this.setTaskError('Error updating task order or you do not have permission');
        }
      });
    });
    this.dragIndex = null;
    this.loadData();
  }
}
