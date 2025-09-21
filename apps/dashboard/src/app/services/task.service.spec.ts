import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TaskService } from './task.service';
import { Task, TaskFormDto } from '@secure-task-mangement/data';

describe('TaskService', () => {
  let service: TaskService;
  let httpMock: HttpTestingController;
  const apiEndPoint = 'http://localhost:3000';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TaskService]
    });
    service = TestBed.inject(TaskService);
    httpMock = TestBed.inject(HttpTestingController);
    
    // Clear localStorage before each test
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.clear();
    }
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('JWT Management', () => {
    it('should set JWT token and store in localStorage', () => {
      const token = 'test-jwt-token';
      service.setJwt(token);
      
      expect(service.getJwt()).toBe(token);
      expect(localStorage.getItem('jwt')).toBe(token);
    });

    it('should remove JWT token from localStorage when setting null', () => {
      localStorage.setItem('jwt', 'existing-token');
      service.setJwt(null as any);
      
      expect(localStorage.getItem('jwt')).toBeNull();
    });

    it('should retrieve JWT from localStorage if not in memory', () => {
      const storedToken = 'stored-jwt-token';
      localStorage.setItem('jwt', storedToken);
      
      const token = service.getJwt();
      expect(token).toBe(storedToken);
    });
  });

  describe('Login', () => {
    it('should send login request with credentials', () => {
      const mockResponse = { access_token: 'mock-token' };
      const email = 'test@example.com';
      const password = 'password123';

      service.login(email, password).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiEndPoint}/api/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email, password });
      req.flush(mockResponse);
    });
  });

  describe('Tasks Operations', () => {
    const mockToken = 'mock-jwt-token';

    beforeEach(() => {
      service.setJwt(mockToken);
    });

    it('should fetch tasks and update observable', () => {
      const mockTasks: Task[] = [
        { id: 1, title: 'Test Task', description: 'Test', status: 'pending', category: 'work', order: 1 }
      ];

      let receivedTasks: Task[] = [];
      service.getTasksObservable().subscribe(tasks => {
        receivedTasks = tasks;
      });

      service.fetchTasks({ category: 'work' });

      const req = httpMock.expectOne(`${apiEndPoint}/api/tasks?category=work`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush(mockTasks);

      expect(receivedTasks).toEqual(mockTasks);
    });

    it('should create a new task', () => {
      const taskDto: TaskFormDto = {
        title: 'New Task',
        description: 'Description',
        category: 'work'
      };

      service.createTask(taskDto).subscribe();

      const req = httpMock.expectOne(`${apiEndPoint}/api/task`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(taskDto);
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush({});
    });

    it('should edit an existing task', () => {
      const taskId = 1;
      const taskDto: TaskFormDto = {
        title: 'Updated Task',
        description: 'Updated Description',
        category: 'personal'
      };

      service.editTask(taskId, taskDto).subscribe();

      const req = httpMock.expectOne(`${apiEndPoint}/api/editTask/${taskId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(taskDto);
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush({});
    });

    it('should delete a task', () => {
      const taskId = 1;

      service.deleteTask(taskId).subscribe();

      const req = httpMock.expectOne(`${apiEndPoint}/api/deleteTask/${taskId}`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush({});
    });

    it('should update task order', () => {
      const taskId = 1;
      const newOrder = 5;

      service.updateTaskOrder(taskId, newOrder).subscribe();

      const req = httpMock.expectOne(`${apiEndPoint}/api/task/${taskId}/order`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ order: newOrder });
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush({});
    });

    it('should update task status', () => {
      const taskId = 1;
      const newStatus = 'completed';

      service.updateTaskStatus(taskId, newStatus).subscribe();

      const req = httpMock.expectOne(`${apiEndPoint}/api/task/${taskId}/status`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ status: newStatus });
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush({});
    });
  });

  describe('Token Validation', () => {
    it('should validate a valid JWT token', () => {
      // Create a mock JWT with future expiration
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload = { exp: futureExp };
      const mockToken = `header.${btoa(JSON.stringify(payload))}.signature`;

      expect(service.isTokenValid(mockToken)).toBe(true);
    });

    it('should invalidate an expired JWT token', () => {
      // Create a mock JWT with past expiration
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payload = { exp: pastExp };
      const mockToken = `header.${btoa(JSON.stringify(payload))}.signature`;

      expect(service.isTokenValid(mockToken)).toBe(false);
    });

    it('should return false for invalid JWT format', () => {
      const invalidToken = 'invalid-token-format';
      expect(service.isTokenValid(invalidToken)).toBe(false);
    });
  });

  describe('Observables', () => {
    it('should return tasks observable', () => {
      const observable = service.getTasksObservable();
      expect(observable).toBeTruthy();
      
      let receivedTasks: Task[] | undefined;
      observable.subscribe(tasks => {
        receivedTasks = tasks;
      });
      
      expect(receivedTasks).toEqual([]);
    });

    it('should return categories observable', () => {
      const observable = service.getCategoriesObservable();
      expect(observable).toBeTruthy();
      
      let receivedCategories: string[] | undefined;
      observable.subscribe(categories => {
        receivedCategories = categories;
      });
      
      expect(receivedCategories).toEqual([]);
    });
  });

  describe('HTTP Headers', () => {
    it('should not include Authorization header when JWT is not set', () => {
      service.setJwt(null as any);
      service.fetchTasks();

      const req = httpMock.expectOne(`${apiEndPoint}/api/tasks`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush([]);
    });
  });
});
