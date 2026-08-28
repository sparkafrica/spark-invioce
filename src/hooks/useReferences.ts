'use client';

import { useQuery } from '@tanstack/react-query';
import {
	getBanks,
	getBusinesses,
	getCompanies,
	getClients,
	getFXRates,
} from '#/lib/server-fns/references';
import { getProducts } from '#/lib/server-fns/crm';

export const qk = {
	businesses: ['references', 'businesses'] as const,
	companies: ['references', 'companies'] as const,
	clients: ['references', 'clients'] as const,
	banks: (currency?: string) =>
		['references', 'banks', currency ?? 'all'] as const,
	fxRates: ['references', 'fx-rates'] as const,
	products: ['references', 'products'] as const,
};

export function useBusinesses() {
	return useQuery({
		queryKey: qk.businesses,
		queryFn: () => getBusinesses({ data: {} }),
	});
}
export function useCompanies() {
	return useQuery({
		queryKey: qk.companies,
		queryFn: () => getCompanies({ data: {} }),
	});
}
export function useClients() {
	return useQuery({
		queryKey: qk.clients,
		queryFn: () => getClients({ data: {} }),
	});
}
export function useBanks(currency?: string) {
	return useQuery({
		queryKey: qk.banks(currency),
		queryFn: () => getBanks({ data: currency ? { currency } : {} }),
	});
}
export function useFXRates() {
	return useQuery({
		queryKey: qk.fxRates,
		queryFn: () => getFXRates({ data: {} }),
	});
}
export function useProducts() {
	return useQuery({
		queryKey: qk.products,
		queryFn: () => getProducts({ data: {} }),
	});
}
