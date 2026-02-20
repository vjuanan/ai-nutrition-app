
-- Enable RLS
ALTER TABLE nutritional_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_items ENABLE ROW LEVEL SECURITY;

-- nutritional_plans
-- Allow users to view their own plans
CREATE POLICY "Users can view own plans" ON nutritional_plans
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to insert their own plans
CREATE POLICY "Users can insert own plans" ON nutritional_plans
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own plans
CREATE POLICY "Users can update own plans" ON nutritional_plans
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Allow users to delete their own plans
CREATE POLICY "Users can delete own plans" ON nutritional_plans
    FOR DELETE
    USING (auth.uid() = user_id);


-- plan_days (Accessible if user owns the plan)
-- We need a policy that checks the parent plan's user_id
CREATE POLICY "Users can view own plan_days" ON plan_days
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM nutritional_plans p
            WHERE p.id = plan_days.plan_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own plan_days" ON plan_days
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM nutritional_plans p
            WHERE p.id = plan_days.plan_id
            AND p.user_id = auth.uid()
        )
    );

-- meals (Accessible if user owns the plan day -> plan)
CREATE POLICY "Users can view own meals" ON meals
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM plan_days d
            JOIN nutritional_plans p ON d.plan_id = p.id
            WHERE d.id = meals.day_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own meals" ON meals
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM plan_days d
            JOIN nutritional_plans p ON d.plan_id = p.id
            WHERE d.id = meals.day_id
            AND p.user_id = auth.uid()
        )
    );

-- meal_items
CREATE POLICY "Users can view own meal_items" ON meal_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM meals m
            JOIN plan_days d ON m.day_id = d.id
            JOIN nutritional_plans p ON d.plan_id = p.id
            WHERE m.id = meal_items.meal_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own meal_items" ON meal_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM meals m
            JOIN plan_days d ON m.day_id = d.id
            JOIN nutritional_plans p ON d.plan_id = p.id
            WHERE m.id = meal_items.meal_id
            AND p.user_id = auth.uid()
        )
    );
