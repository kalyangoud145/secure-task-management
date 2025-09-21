import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { Task, TaskFormDto } from '@secure-task-mangement/data';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private jwt: string | null = null;
  private tasks$ = new BehaviorSubject<Task[]>([]);
  private categories$ = new BehaviorSubject<string[]>([]);
  private http = inject(HttpClient);
  private apiEndPoint = 'http://localhost:3000'

  setJwt(token: string) {
    this.jwt = token;
    if (typeof window !== 'undefined' && window.localStorage) {
      if (token) {
        localStorage.setItem('jwt', token);
      } else {
        localStorage.removeItem('jwt');
      }
    }
  }

  getJwt() {
    if (!this.jwt) {
      if (typeof window !== 'undefined' && window.localStorage) {
        this.jwt = localStorage.getItem('jwt');
      }
    }
    return this.jwt;
  }

  getTasksObservable() {
    return this.tasks$.asObservable();
  }

  getCategoriesObservable() {
    return this.categories$.asObservable();
  }

  login(email: string, password: string) {
    return this.http.post<{ access_token: string }>(this.apiEndPoint +
      '/api/auth/login',
      { email, password }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchTasks(params: any = {}) {
    return this.http.get<Task[]>(this.apiEndPoint +'/api/tasks', {
      params,
      headers: this.jwtHeader()
    }).subscribe(tasks => this.tasks$.next(tasks));
  }


  createTask(dto: TaskFormDto) {
    return this.http.post(this.apiEndPoint +'/api/task', dto, { headers: this.jwtHeader() });
  }

  editTask(id: number, dto: TaskFormDto) {
    return this.http.put(this.apiEndPoint +`/api/editTask/${id}`, dto, { headers: this.jwtHeader() });
  }

  deleteTask(id: number) {
    return this.http.delete(this.apiEndPoint +`/api/deleteTask/${id}`, { headers: this.jwtHeader() });
  }

  updateTaskOrder(id: number, order: number) {
    return this.http.put(this.apiEndPoint +`/api/task/${id}/order`, { order }, { headers: this.jwtHeader() });
  }

  updateTaskStatus(id: number, status: string) {
    return this.http.put(this.apiEndPoint +`/api/task/${id}/status`, { status }, { headers: this.jwtHeader() });
  }

  private jwtHeader() {
    return this.jwt ? new HttpHeaders({ Authorization: `Bearer ${this.jwt}` }) : undefined;
  }

  // Utility to check JWT validity (simple exp check)
  isTokenValid(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}
