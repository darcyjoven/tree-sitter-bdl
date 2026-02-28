FUNCTION t110_apa14(p_apa01)
    DEFINE  l_apb02  LIKE apb_file.apb02,
            l_apb08  LIKE apb_file.apb08,
            l_apb081 LIKE apb_file.apb081,
            l_apb09  LIKE apb_file.apb09,
            l_apb23  LIKE apb_file.apb23,
            l_apb24  LIKE apb_file.apb24,    
            l_apb10  LIKE apb_file.apb10,
            l_apb101 LIKE apb_file.apb101,
            p_apa01  LIKE apa_file.apa01,
            l_apa32  LIKE apa_file.apa32
    DEFINE g_apk    RECORD LIKE apk_file.*

    LET g_apa.apa01=p_apa01 
    LET g_cnt = 0
   
    IF cl_null(g_cnt) THEN LET g_cnt=0 END IF 

    IF g_cnt > 0 THEN
        IF NOT cl_confirm('aap-331') THEN
            CALL cl_err('','aap-888',1)
            LET g_apa.apa14 = g_apa_t.apa14 
            RETURN FALSE
        END IF  
        IF g_amt1 IS NULL THEN
            LET g_amt1 = 0
            LET g_amt1f = 0
        END IF
          
        IF g_amt2 IS NULL THEN
            LET g_amt2 = 0
            LET g_amt2f = 0
        END IF
        !!
        IF g_aptype MATCHES '1*' AND g_aptype <> '15' AND g_aptype <> '17' THEN
            LET g_apa.apa57 = g_amt1 + g_amt2
            LET g_apa.apa57f = g_amt1f + g_amt2f
        END IF
        IF g_aptype MATCHES '2*' THEN
            LET g_apa.apa57 = g_amt2 + g_amt1
            LET g_apa.apa57f = g_amt2f + g_amt1f
        END IF
        IF g_aptype = '15' OR g_aptype = '17' OR g_aptype = '16' THEN
        END IF
        IF g_apa.apa57f IS NULL THEN
            LET g_apa.apa57f = 0
        END IF
        IF g_apa.apa57  IS NULL THEN
            LET g_apa.apa57 = 0
        END IF
        LET g_apa.apa57f=cl_digcut(g_apa.apa57f,t_azi04)
        LET g_apa.apa57=cl_digcut(g_apa.apa57,g_azi04)
   
        CALL t110_b_fill(' 1=1')
        CALL t110_sum_apa()
    ELSE
        IF g_apa.apa00='12' OR g_apa.apa00='15' OR g_apa.apa00='16' OR
            g_apa.apa00='21' OR g_apa.apa00='13' OR g_apa.apa00='17' OR
            g_apa.apa00='22' THEN
            LET g_apa.apa31 = g_apa.apa31f * g_apa.apa14
            LET g_apa.apa31 = cl_digcut(g_apa.apa31,g_azi04)
            LET g_apa.apa32 = g_apa.apa31 * g_apa.apa16 / 100
            CALL t110_apa32() RETURNING l_apa32
            LET g_apa.apa32 = l_apa32
            LET g_apa.apa32 = cl_digcut(g_apa.apa32,g_azi04)
            CALL t110_apa34f('0')
            CALL t110_unpay()
        END IF
    END IF
    RETURN TRUE 
END FUNCTION