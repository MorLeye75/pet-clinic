import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Data, ParamMap, Router, RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap/modal';
import { NgbPagination } from '@ng-bootstrap/ng-bootstrap/pagination';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription, combineLatest, filter, map, tap } from 'rxjs';

import { DEFAULT_SORT_DATA, ITEM_DELETED_EVENT, SORT } from 'app/config/navigation.constants';
import { ITEMS_PER_PAGE, PAGE_HEADER, TOTAL_COUNT_RESPONSE_HEADER } from 'app/config/pagination.constants';
import { IClinique } from 'app/entities/clinique/clinique.model';
import { CliniqueService } from 'app/entities/clinique/service/clinique.service';
import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { ItemCount } from 'app/shared/pagination';
import { SortByDirective, SortDirective, SortService, type SortState, sortStateSignal } from 'app/shared/sort';
import { MedecinDeleteDialog } from '../delete/medecin-delete-dialog';
import { IMedecin } from '../medecin.model';
import { MedecinService } from '../service/medecin.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'jhi-medecin',
  templateUrl: './medecin.html',
  imports: [
    RouterLink,
    FormsModule,
    FontAwesomeModule,
    AlertError,
    Alert,
    SortDirective,
    SortByDirective,
    TranslateDirective,
    TranslatePipe,
    NgbPagination,
    ItemCount,
  ],
})
export class Medecin implements OnInit {
  subscription: Subscription | null = null;
  readonly medecins = signal<IMedecin[]>([]);

  sortState = sortStateSignal({});

  readonly itemsPerPage = signal(ITEMS_PER_PAGE);
  readonly totalItems = signal(0);
  readonly page = signal(1);

  readonly cliniqueFilter = signal<number | null>(null);
  readonly specialiteFilter = signal<string>('');
  readonly cliniquesForFilter = signal<IClinique[]>([]);

  readonly router = inject(Router);
  protected readonly medecinService = inject(MedecinService);
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isLoading = this.medecinService.medecinsResource.isLoading;
  protected readonly activatedRoute = inject(ActivatedRoute);
  protected readonly sortService = inject(SortService);
  protected readonly cliniqueService = inject(CliniqueService);
  protected modalService = inject(NgbModal);

  constructor() {
    effect(() => {
      const headers = this.medecinService.medecinsResource.headers();
      if (headers) {
        this.fillComponentAttributesFromResponseHeader(headers);
      }
    });
    effect(() => {
      this.medecins.set(this.fillComponentAttributesFromResponseBody([...this.medecinService.medecins()]));
    });
  }

  trackId = (item: IMedecin): number => this.medecinService.getMedecinIdentifier(item);

  ngOnInit(): void {
    this.subscription = combineLatest([this.activatedRoute.queryParamMap, this.activatedRoute.data])
      .pipe(
        tap(([params, data]) => this.fillComponentAttributeFromRoute(params, data)),
        tap(() => this.load()),
      )
      .subscribe();

    this.cliniqueService
      .query({ size: 9999 })
      .pipe(map((res: HttpResponse<IClinique[]>) => res.body ?? []))
      .subscribe((cliniques: IClinique[]) => this.cliniquesForFilter.set(cliniques));
  }

  delete(medecin: IMedecin): void {
    const modalRef = this.modalService.open(MedecinDeleteDialog, { size: 'lg', backdrop: 'static' });
    modalRef.componentInstance.medecin = medecin;
    // unsubscribe not needed because closed completes on modal close
    modalRef.closed
      .pipe(
        filter(reason => reason === ITEM_DELETED_EVENT),
        tap(() => this.load()),
      )
      .subscribe();
  }

  load(): void {
    this.queryBackend();
  }

  navigateToWithComponentValues(event: SortState): void {
    this.handleNavigation(this.page(), event);
  }

  navigateToPage(page: number): void {
    this.handleNavigation(page, this.sortState());
  }

  applyFilters(): void {
    this.handleNavigation(1, this.sortState());
  }

  onCliniqueFilterChange(value: string): void {
    this.cliniqueFilter.set(value ? +value : null);
    this.applyFilters();
  }

  onSpecialiteFilterChange(value: string): void {
    this.specialiteFilter.set(value.trim());
    this.applyFilters();
  }

  resetFilters(): void {
    this.cliniqueFilter.set(null);
    this.specialiteFilter.set('');
    this.applyFilters();
  }

  protected fillComponentAttributeFromRoute(params: ParamMap, data: Data): void {
    const page = params.get(PAGE_HEADER);
    this.page.set(+(page ?? 1));
    this.sortState.set(this.sortService.parseSortParam(params.get(SORT) ?? data[DEFAULT_SORT_DATA]));
    const cliniqueId = params.get('cliniqueId');
    this.cliniqueFilter.set(cliniqueId ? +cliniqueId : null);
    this.specialiteFilter.set(params.get('specialite') ?? '');
  }

  protected fillComponentAttributesFromResponseBody(data: IMedecin[]): IMedecin[] {
    return data;
  }

  protected fillComponentAttributesFromResponseHeader(headers: HttpHeaders): void {
    this.totalItems.set(Number(headers.get(TOTAL_COUNT_RESPONSE_HEADER)));
  }

  protected queryBackend(): void {
    const pageToLoad: number = this.page();
    const queryObject: any = {
      page: pageToLoad - 1,
      size: this.itemsPerPage(),
      sort: this.sortService.buildSortParam(this.sortState()),
    };
    const cliniqueId = this.cliniqueFilter();
    if (cliniqueId) {
      queryObject.cliniqueId = cliniqueId;
    }
    const specialite = this.specialiteFilter();
    if (specialite) {
      queryObject.specialite = specialite;
    }
    this.medecinService.medecinsParams.set(queryObject);
  }

  protected handleNavigation(page: number, sortState: SortState): void {
    const queryParamsObj: any = {
      page,
      size: this.itemsPerPage(),
      sort: this.sortService.buildSortParam(sortState),
      cliniqueId: this.cliniqueFilter() || null,
      specialite: this.specialiteFilter() || null,
    };

    this.router.navigate(['./'], {
      relativeTo: this.activatedRoute,
      queryParams: queryParamsObj,
    });
  }
}
