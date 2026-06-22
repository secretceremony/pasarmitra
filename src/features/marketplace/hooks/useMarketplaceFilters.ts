import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { MarketplaceProduct } from '../types/product.types';
import { inventoryService } from '../../inventory/services/inventoryService';
import { CATEGORIES } from '../data/categories';
import { getDateTimeMillis } from '../../../lib/dateUtils';

export function useMarketplaceFilters() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const categoryParam = queryParams.get('category');
  const searchParam = queryParams.get('search');

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [selectedDistributorType, setSelectedDistributorType] = useState<string>('All');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('best_match');

  // Products and Profiles Cache
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync category state from query parameters on load/change
  useEffect(() => {
    if (categoryParam) {
      const decoded = decodeURIComponent(categoryParam);
      const isValid = (CATEGORIES as readonly string[]).includes(decoded);
      if (isValid) {
        setSelectedCategory(decoded);
      } else {
        setSelectedCategory('All');
      }
    } else {
      setSelectedCategory('All');
    }
  }, [categoryParam]);

  // Sync search state from query parameters on load/change
  useEffect(() => {
    if (searchParam) {
      setSearch(decodeURIComponent(searchParam));
    } else {
      setSearch('');
    }
  }, [searchParam]);

  // Set category and update URL param reactively
  const handleSetSelectedCategory = useCallback((newCat: string) => {
    setSelectedCategory(newCat);
    const params = new URLSearchParams(location.search);
    if (newCat === 'All') {
      params.delete('category');
    } else {
      params.set('category', newCat);
    }
    navigate({ search: params.toString() }, { replace: true });
  }, [location.search, navigate]);

  const fetchActiveProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch products, profiles, and reviews in parallel
      const [activeProducts, profilesSnap, reviewsSnap] = await Promise.all([
        inventoryService.getActiveProducts(),
        getDocs(collection(db, 'profiles')),
        getDocs(collection(db, 'reviews'))
      ]);
      
      const profileMap: Record<string, any> = {};
      profilesSnap.forEach((docSnap) => {
        profileMap[docSnap.id] = docSnap.data();
      });
      setProfiles(profileMap);

      const reviewMap: Record<string, { total: number; count: number }> = {};
      reviewsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const pId = data.product_id;
        const rating = Number(data.rating || 0);
        if (pId && rating > 0) {
          if (!reviewMap[pId]) {
            reviewMap[pId] = { total: 0, count: 0 };
          }
          reviewMap[pId].total += rating;
          reviewMap[pId].count += 1;
        }
      });

      const mapped: MarketplaceProduct[] = activeProducts.map(p => {
        const reviewData = reviewMap[p.id];
        const distProfile = profileMap[p.distributor_id];
        const distReputation = distProfile?.reputation_score ?? 4.7;
        
        // Calculate average rating or default to distributor's reputation score
        const rating = reviewData ? Number((reviewData.total / reviewData.count).toFixed(1)) : distReputation;
        const count = reviewData ? reviewData.count : 0;
        
        return {
          id: p.id,
          name: p.name,
          price: p.price,
          category: p.category,
          image: p.image_url || '/assets/fallback-product.png',
          rating: rating,
          reviewCount: count,
          bulk: `${p.min_order_quantity} ${p.unit_type}`,
          unit: p.unit_type,
          distributor: p.distributor_name || 'Distributor',
          distributorId: p.distributor_id,
          stock: p.stock,
          created_at: p.created_at
        };
      });
      
      setProducts(mapped);
    } catch (err) {
      console.error('Failed to load active marketplace products:', err);
      setError('Gagal memuat produk dari Firestore');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveProducts();
  }, [fetchActiveProducts]);

  // Helper matching functions
  const matchDistributorType = useCallback((profileType: string, filterType: string): boolean => {
    if (filterType === 'All') return true;
    const pt = (profileType || '').toLowerCase().trim();
    const ft = filterType.toLowerCase().trim();

    if (ft === 'distributor sembako') {
      return pt.includes('sembako') || pt.includes('beras') || pt.includes('telur') || pt.includes('minyak');
    }
    if (ft === 'supplier sayur & buah') {
      return pt.includes('sayur') || pt.includes('buah');
    }
    if (ft === 'supplier seafood/daging') {
      return pt.includes('daging') || pt.includes('seafood') || pt.includes('marine');
    }
    if (ft === 'supplier kemasan') {
      return pt.includes('kemasan') || pt.includes('pack');
    }
    if (ft === 'supplier minuman') {
      return pt.includes('minuman');
    }
    if (ft === 'supplier bahan kue') {
      return pt.includes('bahan kue') || pt.includes('baking') || pt.includes('gula');
    }
    if (ft === 'supplier frozen food') {
      return pt.includes('frozen') || pt.includes('beku');
    }
    if (ft === 'supplier kebersihan usaha') {
      return pt.includes('kebersihan') || pt.includes('bersih') || pt.includes('clean');
    }
    if (ft === 'supplier kopi/teh') {
      return pt.includes('kopi') || pt.includes('teh') || pt.includes('coffee') || pt.includes('tea');
    }
    if (ft === 'grosir campuran') {
      return pt.includes('grosir') || pt.includes('campuran') || pt.includes('beras') || pt.includes('telur') || pt.includes('gula');
    }
    
    return pt.includes(ft) || ft.includes(pt);
  }, []);

  const matchLocation = useCallback((address: string, filterLocation: string): boolean => {
    if (filterLocation === 'All') return true;
    return (address || '').toLowerCase().includes(filterLocation.toLowerCase());
  }, []);

  // Filter Combination Logic
  const filteredProducts = useMemo(() => {
    const filtered = products.filter(p => {
      const distProfile = profiles[p.distributorId];
      const distAddress = distProfile?.address || '';
      const distBusinessType = distProfile?.business_type || '';
      const distIsVerified = distProfile?.is_verified === true || distProfile?.verification_status === 'VERIFIED';

      // 1. Search keyword (name or distributor name)
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                            (p.distributor || '').toLowerCase().includes(search.toLowerCase());

      // 2. Category
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

      // 3. Price
      const matchesMinPrice = minPrice === '' || p.price >= Number(minPrice);
      const matchesMaxPrice = maxPrice === '' || p.price <= Number(maxPrice);

      // 4. Location
      const matchesLocation = matchLocation(distAddress, selectedLocation);

      // 5. Distributor Type
      const matchesDistributorType = matchDistributorType(distBusinessType, selectedDistributorType);

      // 6. Verified Status
      const matchesVerified = !verifiedOnly || distIsVerified;

      // 7. Rating
      const matchesRating = p.rating >= minRating;

      return matchesSearch && 
             matchesCategory && 
             matchesMinPrice && 
             matchesMaxPrice && 
             matchesLocation && 
             matchesDistributorType && 
             matchesVerified && 
             matchesRating;
    });

    // Apply Sorting
    if (sortBy === 'price_asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'newest') {
      filtered.sort((a, b) => getDateTimeMillis(b.created_at) - getDateTimeMillis(a.created_at));
    } else {
      // 'best_match' or default: sort by newest (created_at desc)
      filtered.sort((a, b) => getDateTimeMillis(b.created_at) - getDateTimeMillis(a.created_at));
    }

    return filtered;
  }, [
    products, 
    profiles, 
    search, 
    selectedCategory, 
    minPrice, 
    maxPrice, 
    selectedLocation, 
    selectedDistributorType, 
    verifiedOnly, 
    minRating, 
    sortBy,
    matchDistributorType, 
    matchLocation
  ]);

  const resetFilters = useCallback(() => {
    setSearch('');
    setMinPrice('');
    setMaxPrice('');
    setSelectedLocation('All');
    setSelectedDistributorType('All');
    setVerifiedOnly(false);
    setMinRating(0);
    setSortBy('best_match');

    // Clear URL parameters cleanly
    const params = new URLSearchParams(location.search);
    params.delete('category');
    params.delete('search');
    navigate({ search: params.toString() }, { replace: true });

    setSelectedCategory('All');
  }, [location.search, navigate]);

  return {
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory: handleSetSelectedCategory,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    selectedLocation,
    setSelectedLocation,
    selectedDistributorType,
    setSelectedDistributorType,
    verifiedOnly,
    setVerifiedOnly,
    minRating,
    setMinRating,
    sortBy,
    setSortBy,
    products,
    filteredProducts,
    isLoading,
    error,
    resetFilters,
    refetch: fetchActiveProducts
  };
}
