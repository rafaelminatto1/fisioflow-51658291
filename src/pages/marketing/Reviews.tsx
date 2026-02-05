import React, { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const getReviews = httpsCallable(functions, 'getBusinessReviews');
        const result = await getReviews();
        setReviews((result.data as any).reviews);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Avaliações Google</h1>
      <div className="grid gap-4">
        {reviews.map((review, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex justify-between">
                <CardTitle className="text-lg">{review.author}</CardTitle>
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className={`w-4 h-4 ${j < review.rating ? 'fill-current' : 'text-gray-300'}`} />
                  ))}
                </div>
              </div>
              <div className="text-xs text-gray-500">{review.date}</div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{review.comment}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
