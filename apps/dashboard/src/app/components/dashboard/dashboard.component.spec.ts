import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { TaskService } from '../../services/task.service';
import { of, throwError } from 'rxjs';

interface Task {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  order?: number;
}

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockTaskService: any;

  beforeEach(async () => {
    mockTaskService = {
      getJwt: jest.fn(),
      isTokenValid: jest.fn(),
      getTasksObservable: jest.fn(() => of([])), 
      getCategoriesObservable: jest.fn(() => of([])), 
      login: jest.fn(),
      setJwt: jest.fn(),
      fetchTasks: jest.fn(),
      editTask: jest.fn(),
      createTask: jest.fn(),
      deleteTask: jest.fn(),
      updateTaskOrder: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: TaskService, useValue: mockTaskService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set isAuthenticated true if token is valid', () => {
    mockTaskService.getJwt.mockReturnValue('token');
    mockTaskService.isTokenValid.mockReturnValue(true);
    mockTaskService.getTasksObservable.mockReturnValue(of([]));
    mockTaskService.getCategoriesObservable.mockReturnValue(of([]));
    component.ngOnInit();
    expect(component.isAuthenticated).toBe(true);
  });

  it('should set isAuthenticated false if token is invalid', () => {
    mockTaskService.getJwt.mockReturnValue('token');
    mockTaskService.isTokenValid.mockReturnValue(false);
    mockTaskService.getTasksObservable.mockReturnValue(of([]));
    mockTaskService.getCategoriesObservable.mockReturnValue(of([]));
    component.ngOnInit();
    expect(component.isAuthenticated).toBe(false);
  });

  it('should login successfully', () => {
    const loginResponse = { access_token: 'jwt' };
    mockTaskService.login.mockReturnValue(of(loginResponse));
    mockTaskService.setJwt.mockImplementation(() => undefined);
    component.loginData = { username: 'user', password: 'pass' };
    component.login();
    expect(component.isAuthenticated).toBe(true);
    expect(mockTaskService.setJwt).toHaveBeenCalledWith('jwt');
  });

  it('should set loginError on failed login', () => {
    mockTaskService.login.mockReturnValue(throwError(() => new Error('fail')));
    component.loginData = { username: 'user', password: 'wrong' };
    component.login();
    expect(component.loginError).toBe('Invalid credentials');
  });

  it('should logout and reset state', () => {
    component.isAuthenticated = true;
    component.tasks = [{ id: 1 } as Task];
    component.filteredTasks = [{ id: 1 } as Task];
    component.loginData = { username: 'user', password: 'pass' };
    mockTaskService.setJwt.mockImplementation(() => undefined);
    component.logout();
    expect(component.isAuthenticated).toBe(false);
    expect(component.tasks.length).toBe(0);
    expect(component.filteredTasks.length).toBe(0);
    expect(component.loginData).toEqual({ username: '', password: '' });
  });

  it('should apply category filter', () => {
    component.tasks = [
      { id: 1, category: 'A', status: 'Todo' } as Task,
      { id: 2, category: 'B', status: 'Done' } as Task
    ];
    component.filter = { category: 'A', status: '' };
    component.applyFilters();
    expect(component.filteredTasks.length).toBe(1);
    expect(component.filteredTasks[0].category).toBe('A');
  });

  it('should open and close task modal', () => {
    component.showTaskModal = false;
    component.openCreateTask();
    expect(component.showTaskModal).toBe(true);
    component.closeTaskModal();
    expect(component.showTaskModal).toBe(false);
  });
});
